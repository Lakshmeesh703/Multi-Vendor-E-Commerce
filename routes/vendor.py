"""
Vendor Routes
Handles vendor operations: product management, sales, inventory
"""

from flask import Blueprint, render_template, request, redirect, url_for, session, flash, jsonify
from db.postgres import pg_db
from db.mongodb import mongo_db
from routes.auth import login_required

vendor_bp = Blueprint('vendor', __name__, url_prefix='/vendor')

@vendor_bp.route('/dashboard')
@login_required(role='vendor')
def dashboard():
    """Vendor dashboard"""
    try:
        user_id = session['user_id']
        
        # Get vendor info
        vendor = pg_db.execute_query(
            "SELECT * FROM vendors WHERE user_id = %s",
            (user_id,),
            fetch_one=True
        )
        
        if not vendor:
            flash("Vendor account not found", "error")
            return redirect(url_for('customer.home'))
        
        vendor_id = vendor['id']
        
        # Get vendor statistics
        total_products = len(mongo_db.get_vendor_products(vendor_id))
        
        total_sales = pg_db.execute_query(
            """SELECT COALESCE(SUM(oi.price * oi.quantity), 0) as total
               FROM order_items oi
               WHERE oi.vendor_id = %s""",
            (vendor_id,),
            fetch_one=True
        )
        
        recent_orders = pg_db.execute_query(
            """SELECT oi.*, o.status, o.created_at FROM order_items oi
               JOIN orders o ON oi.order_id = o.id
               WHERE oi.vendor_id = %s
               ORDER BY o.created_at DESC LIMIT 10""",
            (vendor_id,)
        )
        
        return render_template('vendor_dashboard.html',
                             vendor=vendor,
                             total_products=total_products,
                             total_sales=total_sales['total'] if total_sales else 0,
                             recent_orders=recent_orders)
    except Exception as e:
        flash(f"Dashboard error: {str(e)}", "error")
        return render_template('vendor_dashboard.html', vendor=None, 
                             total_products=0, total_sales=0, recent_orders=[])

@vendor_bp.route('/products')
@login_required(role='vendor')
def products():
    """View vendor products"""
    try:
        user_id = session['user_id']
        vendor = pg_db.execute_query(
            "SELECT id FROM vendors WHERE user_id = %s",
            (user_id,),
            fetch_one=True
        )
        
        if not vendor:
            flash("Vendor account not found", "error")
            return redirect(url_for('customer.home'))
        
        products = mongo_db.get_vendor_products(vendor['id'])
        for product in products:
            product['_id'] = str(product['_id'])
        
        return render_template('vendor_products.html', products=products)
    except Exception as e:
        flash(f"Error loading products: {str(e)}", "error")
        return render_template('vendor_products.html', products=[])

@vendor_bp.route('/product/add', methods=['GET', 'POST'])
@login_required(role='vendor')
def add_product():
    """Add new product"""
    if request.method == 'POST':
        try:
            user_id = session['user_id']
            vendor = pg_db.execute_query(
                "SELECT id FROM vendors WHERE user_id = %s",
                (user_id,),
                fetch_one=True
            )
            
            if not vendor:
                flash("Vendor account not found", "error")
                return redirect(url_for('customer.home'))
            
            # Get form data
            product_data = {
                'vendor_id': vendor['id'],
                'name': request.form.get('name', '').strip(),
                'category': request.form.get('category', '').strip(),
                'price': float(request.form.get('price', 0)),
                'stock': int(request.form.get('stock', 0)),
                'description': request.form.get('description', '').strip(),
                'attributes': {},  # Dynamic attributes
                'reviews': []
            }
            
            # Validate
            if not product_data['name'] or not product_data['category']:
                flash("Product name and category are required", "error")
                return redirect(url_for('vendor.add_product'))
            
            if product_data['price'] <= 0 or product_data['stock'] < 0:
                flash("Invalid price or stock", "error")
                return redirect(url_for('vendor.add_product'))
            
            # Insert product into MongoDB
            product_id = mongo_db.insert_product(product_data)
            
            flash(f"Product added successfully! ID: {product_id}", "success")
            return redirect(url_for('vendor.products'))
        
        except Exception as e:
            flash(f"Error adding product: {str(e)}", "error")
            return redirect(url_for('vendor.add_product'))
    
    return render_template('vendor_add_product.html')

@vendor_bp.route('/product/<product_id>/edit', methods=['GET', 'POST'])
@login_required(role='vendor')
def edit_product(product_id):
    """Edit existing product"""
    try:
        user_id = session['user_id']
        vendor = pg_db.execute_query(
            "SELECT id FROM vendors WHERE user_id = %s",
            (user_id,),
            fetch_one=True
        )
        
        product = mongo_db.get_product(product_id)
        if not product or product.get('vendor_id') != vendor['id']:
            flash("Product not found or unauthorized", "error")
            return redirect(url_for('vendor.products'))
        
        if request.method == 'POST':
            # Update product
            update_data = {
                'name': request.form.get('name', product.get('name')),
                'category': request.form.get('category', product.get('category')),
                'price': float(request.form.get('price', product.get('price', 0))),
                'stock': int(request.form.get('stock', product.get('stock', 0))),
                'description': request.form.get('description', product.get('description', '')),
            }
            
            from bson.objectid import ObjectId
            collection = mongo_db.get_collection('products')
            collection.update_one(
                {'_id': ObjectId(product_id)},
                {'$set': update_data}
            )
            
            flash("Product updated successfully", "success")
            return redirect(url_for('vendor.products'))
        
        product['_id'] = str(product['_id'])
        return render_template('vendor_edit_product.html', product=product)
    
    except Exception as e:
        flash(f"Error editing product: {str(e)}", "error")
        return redirect(url_for('vendor.products'))

@vendor_bp.route('/product/<product_id>/delete', methods=['POST'])
@login_required(role='vendor')
def delete_product(product_id):
    """Delete product"""
    try:
        user_id = session['user_id']
        vendor = pg_db.execute_query(
            "SELECT id FROM vendors WHERE user_id = %s",
            (user_id,),
            fetch_one=True
        )
        
        product = mongo_db.get_product(product_id)
        if not product or product.get('vendor_id') != vendor['id']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        from bson.objectid import ObjectId
        collection = mongo_db.get_collection('products')
        collection.delete_one({'_id': ObjectId(product_id)})
        
        flash("Product deleted successfully", "success")
        return redirect(url_for('vendor.products'))
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@vendor_bp.route('/sales')
@login_required(role='vendor')
def sales():
    """View sales/orders"""
    try:
        user_id = session['user_id']
        vendor = pg_db.execute_query(
            "SELECT id FROM vendors WHERE user_id = %s",
            (user_id,),
            fetch_one=True
        )
        
        orders = pg_db.execute_query(
            """SELECT oi.*, o.status, o.created_at, o.id as order_id, u.name, u.email
               FROM order_items oi
               JOIN orders o ON oi.order_id = o.id
               JOIN users u ON o.user_id = u.id
               WHERE oi.vendor_id = %s
               ORDER BY o.created_at DESC""",
            (vendor['id'],)
        )
        
        return render_template('vendor_sales.html', orders=orders)
    except Exception as e:
        flash(f"Error loading sales: {str(e)}", "error")
        return render_template('vendor_sales.html', orders=[])

@vendor_bp.route('/inventory')
@login_required(role='vendor')
def inventory():
    """Manage inventory"""
    try:
        user_id = session['user_id']
        vendor = pg_db.execute_query(
            "SELECT id FROM vendors WHERE user_id = %s",
            (user_id,),
            fetch_one=True
        )
        
        products = mongo_db.get_vendor_products(vendor['id'])
        for product in products:
            product['_id'] = str(product['_id'])
        
        return render_template('vendor_inventory.html', products=products)
    except Exception as e:
        flash(f"Error loading inventory: {str(e)}", "error")
        return render_template('vendor_inventory.html', products=[])

@vendor_bp.route('/inventory/<product_id>/update', methods=['POST'])
@login_required(role='vendor')
def update_inventory(product_id):
    """Update product inventory"""
    try:
        user_id = session['user_id']
        vendor = pg_db.execute_query(
            "SELECT id FROM vendors WHERE user_id = %s",
            (user_id,),
            fetch_one=True
        )
        
        product = mongo_db.get_product(product_id)
        if not product or product.get('vendor_id') != vendor['id']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        new_stock = int(request.form.get('stock', 0))
        
        from bson.objectid import ObjectId
        collection = mongo_db.get_collection('products')
        collection.update_one(
            {'_id': ObjectId(product_id)},
            {'$set': {'stock': new_stock}}
        )
        
        return jsonify({'success': True, 'message': 'Inventory updated'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
