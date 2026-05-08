"""
Customer Routes
Handles customer operations: browsing, cart, wishlist, orders
"""

from flask import Blueprint, render_template, request, redirect, url_for, session, flash, jsonify
from db.postgres import pg_db
from db.mongodb import mongo_db
from routes.auth import login_required
from bson.objectid import ObjectId
import json

customer_bp = Blueprint('customer', __name__, url_prefix='/customer')

@customer_bp.route('/')
def home():
    """Home page with featured products"""
    try:
        # Get all products from MongoDB
        products_collection = mongo_db.get_collection('products')
        products = list(products_collection.find({}).limit(20))
        
        # Convert ObjectId to string for JSON serialization
        for product in products:
            product['_id'] = str(product['_id'])
        
        return render_template('home.html', products=products)
    except Exception as e:
        print(f"Home page error: {e}")
        return render_template('home.html', products=[])

@customer_bp.route('/products')
def products():
    """Browse all products with filters"""
    try:
        # Get filters from query parameters
        category = request.args.get('category', '')
        min_price = request.args.get('min_price', type=float)
        max_price = request.args.get('max_price', type=float)
        search = request.args.get('search', '')
        
        # Build MongoDB query
        query = {}
        if category:
            query['category'] = category
        if min_price is not None:
            query['price'] = {'$gte': min_price}
        if max_price is not None:
            if 'price' in query:
                query['price']['$lte'] = max_price
            else:
                query['price'] = {'$lte': max_price}
        
        products_collection = mongo_db.get_collection('products')
        products = list(products_collection.find(query).limit(100))
        
        # Convert ObjectId to string
        for product in products:
            product['_id'] = str(product['_id'])
        
        # Get unique categories
        categories = products_collection.distinct('category')
        
        return render_template('products.html', 
                             products=products, 
                             categories=categories,
                             selected_category=category)
    except Exception as e:
        flash(f"Error loading products: {str(e)}", "error")
        return render_template('products.html', products=[], categories=[])

@customer_bp.route('/product/<product_id>')
def product_detail(product_id):
    """View product details"""
    try:
        product = mongo_db.get_product(product_id)
        if not product:
            flash("Product not found", "error")
            return redirect(url_for('customer.products'))
        
        product['_id'] = str(product['_id'])
        
        # Get vendor info
        vendor = None
        if 'vendor_id' in product:
            vendor = pg_db.execute_query(
                "SELECT v.store_name FROM vendors v WHERE v.id = %s",
                (product['vendor_id'],),
                fetch_one=True
            )
        
        return render_template('product_detail.html', product=product, vendor=vendor)
    except Exception as e:
        flash(f"Error loading product: {str(e)}", "error")
        return redirect(url_for('customer.products'))

@customer_bp.route('/cart')
def cart():
    """View shopping cart"""
    if 'user_id' not in session:
        flash("Please login to view your cart", "error")
        return redirect(url_for('auth.login'))
    
    try:
        user_id = session['user_id']
        cart_items = pg_db.execute_query(
            """SELECT ci.*, p.name, p.price, p.stock, v.store_name
               FROM cart_items ci
               LEFT JOIN vendors v ON ci.vendor_id = v.id
               WHERE ci.user_id = %s""",
            (user_id,)
        )
        
        # Fetch product details from MongoDB
        for item in cart_items:
            product = mongo_db.get_product(item['product_id'])
            if product:
                item['name'] = product.get('name', 'Unknown')
                item['price'] = product.get('price', item['price'])
                item['stock'] = product.get('stock', 0)
        
        total_price = sum(item['price'] * item['quantity'] for item in cart_items)
        
        return render_template('cart.html', cart_items=cart_items, total_price=total_price)
    except Exception as e:
        flash(f"Error loading cart: {str(e)}", "error")
        return render_template('cart.html', cart_items=[], total_price=0)

@customer_bp.route('/cart/add/<product_id>', methods=['POST'])
def add_to_cart(product_id):
    """Add product to cart"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Please login first'}), 401
    
    try:
        user_id = session['user_id']
        quantity = request.form.get('quantity', 1, type=int)
        
        product = mongo_db.get_product(product_id)
        if not product:
            return jsonify({'success': False, 'message': 'Product not found'}), 404
        
        vendor_id = product.get('vendor_id')
        
        # Check if item already in cart
        existing = pg_db.execute_query(
            "SELECT id, quantity FROM cart_items WHERE user_id = %s AND product_id = %s",
            (user_id, product_id),
            fetch_one=True
        )
        
        if existing:
            pg_db.execute_query(
                "UPDATE cart_items SET quantity = quantity + %s WHERE id = %s",
                (quantity, existing['id'])
            )
        else:
            pg_db.execute_query(
                "INSERT INTO cart_items (user_id, product_id, vendor_id, quantity) VALUES (%s, %s, %s, %s)",
                (user_id, product_id, vendor_id, quantity)
            )
        
        flash(f"Added {quantity} item(s) to cart", "success")
        return jsonify({'success': True, 'message': 'Added to cart'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@customer_bp.route('/cart/remove/<int:item_id>', methods=['POST'])
def remove_from_cart(item_id):
    """Remove item from cart"""
    if 'user_id' not in session:
        return jsonify({'success': False}), 401
    
    try:
        pg_db.execute_query(
            "DELETE FROM cart_items WHERE id = %s AND user_id = %s",
            (item_id, session['user_id'])
        )
        flash("Item removed from cart", "success")
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@customer_bp.route('/checkout', methods=['GET', 'POST'])
@login_required()
def checkout():
    """Checkout process"""
    user_id = session['user_id']
    
    if request.method == 'POST':
        try:
            # Get shipping address
            address_id = request.form.get('address_id', type=int)
            payment_method = request.form.get('payment_method', 'credit_card')
            
            # Get cart items
            cart_items = pg_db.execute_query(
                "SELECT * FROM cart_items WHERE user_id = %s",
                (user_id,)
            )
            
            if not cart_items:
                flash("Your cart is empty", "error")
                return redirect(url_for('customer.cart'))
            
            # Calculate total
            total_amount = 0
            for item in cart_items:
                product = mongo_db.get_product(item['product_id'])
                if product:
                    total_amount += product.get('price', 0) * item['quantity']
            
            # Create order and payment in transaction
            queries = [
                # Insert order
                ("INSERT INTO orders (user_id, total_amount, status, shipping_address_id) VALUES (%s, %s, %s, %s) RETURNING id",
                 (user_id, total_amount, 'pending', address_id)),
            ]
            
            # Execute transaction
            pg_db.execute_transaction(queries)
            
            # Get the created order ID
            order = pg_db.execute_query(
                "SELECT id FROM orders WHERE user_id = %s ORDER BY created_at DESC LIMIT 1",
                (user_id,),
                fetch_one=True
            )
            
            if order:
                order_id = order['id']
                
                # Add order items
                for item in cart_items:
                    pg_db.execute_query(
                        """INSERT INTO order_items (order_id, product_id, vendor_id, quantity, price)
                           VALUES (%s, %s, %s, %s, %s)""",
                        (order_id, item['product_id'], item['vendor_id'], item['quantity'], 
                         mongo_db.get_product(item['product_id']).get('price', 0))
                    )
                    
                    # Deduct stock
                    mongo_db.update_stock(item['product_id'], item['quantity'])
                
                # Create payment record
                pg_db.execute_query(
                    """INSERT INTO payments (order_id, payment_method, amount, payment_status)
                       VALUES (%s, %s, %s, %s)""",
                    (order_id, payment_method, total_amount, 'completed')
                )
                
                # Clear cart
                pg_db.execute_query(
                    "DELETE FROM cart_items WHERE user_id = %s",
                    (user_id,)
                )
                
                flash(f"Order placed successfully! Order ID: {order_id}", "success")
                return redirect(url_for('customer.order_detail', order_id=order_id))
            
            flash("Error creating order", "error")
            return redirect(url_for('customer.checkout'))
        
        except Exception as e:
            flash(f"Checkout error: {str(e)}", "error")
            return redirect(url_for('customer.checkout'))
    
    # GET method - show checkout form
    try:
        addresses = pg_db.execute_query(
            "SELECT * FROM addresses WHERE user_id = %s",
            (user_id,)
        )
        
        cart_items = pg_db.execute_query(
            "SELECT * FROM cart_items WHERE user_id = %s",
            (user_id,)
        )
        
        total_amount = 0
        for item in cart_items:
            product = mongo_db.get_product(item['product_id'])
            if product:
                total_amount += product.get('price', 0) * item['quantity']
        
        return render_template('checkout.html', 
                             addresses=addresses, 
                             cart_items=cart_items,
                             total_amount=total_amount)
    except Exception as e:
        flash(f"Error loading checkout: {str(e)}", "error")
        return redirect(url_for('customer.cart'))

@customer_bp.route('/orders')
@login_required()
def orders():
    """View order history"""
    try:
        user_id = session['user_id']
        orders = pg_db.execute_query(
            "SELECT * FROM orders WHERE user_id = %s ORDER BY created_at DESC",
            (user_id,)
        )
        
        return render_template('orders.html', orders=orders)
    except Exception as e:
        flash(f"Error loading orders: {str(e)}", "error")
        return render_template('orders.html', orders=[])

@customer_bp.route('/order/<int:order_id>')
@login_required()
def order_detail(order_id):
    """View order details"""
    try:
        user_id = session['user_id']
        order = pg_db.execute_query(
            "SELECT * FROM orders WHERE id = %s AND user_id = %s",
            (order_id, user_id),
            fetch_one=True
        )
        
        if not order:
            flash("Order not found", "error")
            return redirect(url_for('customer.orders'))
        
        order_items = pg_db.execute_query(
            """SELECT oi.*, v.store_name FROM order_items oi
               LEFT JOIN vendors v ON oi.vendor_id = v.id
               WHERE oi.order_id = %s""",
            (order_id,)
        )
        
        payment = pg_db.execute_query(
            "SELECT * FROM payments WHERE order_id = %s",
            (order_id,),
            fetch_one=True
        )
        
        return render_template('order_detail.html', 
                             order=order, 
                             order_items=order_items,
                             payment=payment)
    except Exception as e:
        flash(f"Error loading order: {str(e)}", "error")
        return redirect(url_for('customer.orders'))

@customer_bp.route('/wishlist')
@login_required()
def wishlist():
    """View wishlist"""
    try:
        user_id = session['user_id']
        wishlist_items = pg_db.execute_query(
            "SELECT * FROM wishlist_items WHERE user_id = %s",
            (user_id,)
        )
        
        # Fetch product details
        products = []
        for item in wishlist_items:
            product = mongo_db.get_product(item['product_id'])
            if product:
                product['_id'] = str(product['_id'])
                product['wishlist_id'] = item['id']
                products.append(product)
        
        return render_template('wishlist.html', products=products)
    except Exception as e:
        flash(f"Error loading wishlist: {str(e)}", "error")
        return render_template('wishlist.html', products=[])

@customer_bp.route('/wishlist/add/<product_id>', methods=['POST'])
def add_to_wishlist(product_id):
    """Add product to wishlist"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Please login first'}), 401
    
    try:
        user_id = session['user_id']
        pg_db.execute_query(
            "INSERT INTO wishlist_items (user_id, product_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (user_id, product_id)
        )
        return jsonify({'success': True, 'message': 'Added to wishlist'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@customer_bp.route('/wishlist/remove/<product_id>', methods=['POST'])
def remove_from_wishlist(product_id):
    """Remove from wishlist"""
    if 'user_id' not in session:
        return jsonify({'success': False}), 401
    
    try:
        pg_db.execute_query(
            "DELETE FROM wishlist_items WHERE user_id = %s AND product_id = %s",
            (session['user_id'], product_id)
        )
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False}), 500
