"""
Admin Routes
Handles admin operations: user management, vendor approval, commissions
"""

from flask import Blueprint, render_template, request, redirect, url_for, session, flash, jsonify
from db.postgres import pg_db
from functools import wraps
from routes.auth import login_required

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

def admin_required(f):
    """Decorator to check if user is admin"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session or session.get('user_role') != 'admin':
            flash("Unauthorized access", "error")
            return redirect(url_for('customer.home'))
        return f(*args, **kwargs)
    return decorated_function

@admin_bp.route('/dashboard')
@admin_required
def dashboard():
    """Admin dashboard with statistics"""
    try:
        # Get statistics
        total_users = pg_db.execute_query(
            "SELECT COUNT(*) as count FROM users WHERE role = 'customer'",
            fetch_one=True
        )
        
        total_vendors = pg_db.execute_query(
            "SELECT COUNT(*) as count FROM vendors",
            fetch_one=True
        )
        
        approved_vendors = pg_db.execute_query(
            "SELECT COUNT(*) as count FROM vendors WHERE approval_status = 'approved'",
            fetch_one=True
        )
        
        pending_vendors = pg_db.execute_query(
            "SELECT COUNT(*) as count FROM vendors WHERE approval_status = 'pending'",
            fetch_one=True
        )
        
        total_orders = pg_db.execute_query(
            "SELECT COUNT(*) as count FROM orders",
            fetch_one=True
        )
        
        total_revenue = pg_db.execute_query(
            "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = 'delivered'",
            fetch_one=True
        )
        
        return render_template('admin_dashboard.html',
                             total_users=total_users['count'] if total_users else 0,
                             total_vendors=total_vendors['count'] if total_vendors else 0,
                             approved_vendors=approved_vendors['count'] if approved_vendors else 0,
                             pending_vendors=pending_vendors['count'] if pending_vendors else 0,
                             total_orders=total_orders['count'] if total_orders else 0,
                             total_revenue=total_revenue['total'] if total_revenue else 0)
    except Exception as e:
        flash(f"Dashboard error: {str(e)}", "error")
        return render_template('admin_dashboard.html',
                             total_users=0, total_vendors=0, approved_vendors=0,
                             pending_vendors=0, total_orders=0, total_revenue=0)

@admin_bp.route('/users')
@admin_required
def users():
    """Manage users"""
    try:
        all_users = pg_db.execute_query(
            "SELECT * FROM users ORDER BY created_at DESC"
        )
        
        return render_template('admin_users.html', users=all_users)
    except Exception as e:
        flash(f"Error loading users: {str(e)}", "error")
        return render_template('admin_users.html', users=[])

@admin_bp.route('/users/<int:user_id>/view')
@admin_required
def view_user(user_id):
    """View user details"""
    try:
        user = pg_db.execute_query(
            "SELECT * FROM users WHERE id = %s",
            (user_id,),
            fetch_one=True
        )
        
        if not user:
            flash("User not found", "error")
            return redirect(url_for('admin.users'))
        
        addresses = pg_db.execute_query(
            "SELECT * FROM addresses WHERE user_id = %s",
            (user_id,)
        ) if user['role'] == 'customer' else []
        
        orders = pg_db.execute_query(
            "SELECT * FROM orders WHERE user_id = %s ORDER BY created_at DESC",
            (user_id,)
        ) if user['role'] == 'customer' else []
        
        return render_template('admin_view_user.html',
                             user=user,
                             addresses=addresses,
                             orders=orders)
    except Exception as e:
        flash(f"Error loading user: {str(e)}", "error")
        return redirect(url_for('admin.users'))

@admin_bp.route('/vendors')
@admin_required
def vendors():
    """Manage vendors"""
    try:
        vendors = pg_db.execute_query(
            """SELECT v.*, u.name, u.email FROM vendors v
               JOIN users u ON v.user_id = u.id
               ORDER BY v.created_at DESC"""
        )
        
        return render_template('admin_vendors.html', vendors=vendors)
    except Exception as e:
        flash(f"Error loading vendors: {str(e)}", "error")
        return render_template('admin_vendors.html', vendors=[])

@admin_bp.route('/vendors/<int:vendor_id>/approve', methods=['POST'])
@admin_required
def approve_vendor(vendor_id):
    """Approve vendor"""
    try:
        pg_db.execute_query(
            """UPDATE vendors SET approval_status = %s, approved_at = CURRENT_TIMESTAMP
               WHERE id = %s""",
            ('approved', vendor_id)
        )
        
        # Get vendor details for notification
        vendor = pg_db.execute_query(
            "SELECT * FROM vendors WHERE id = %s",
            (vendor_id,),
            fetch_one=True
        )
        
        flash(f"Vendor '{vendor['store_name']}' approved successfully", "success")
        return redirect(url_for('admin.vendors'))
    except Exception as e:
        flash(f"Error approving vendor: {str(e)}", "error")
        return redirect(url_for('admin.vendors'))

@admin_bp.route('/vendors/<int:vendor_id>/reject', methods=['POST'])
@admin_required
def reject_vendor(vendor_id):
    """Reject vendor"""
    try:
        pg_db.execute_query(
            "UPDATE vendors SET approval_status = %s WHERE id = %s",
            ('rejected', vendor_id)
        )
        
        flash("Vendor rejected successfully", "success")
        return redirect(url_for('admin.vendors'))
    except Exception as e:
        flash(f"Error rejecting vendor: {str(e)}", "error")
        return redirect(url_for('admin.vendors'))

@admin_bp.route('/commissions')
@admin_required
def commissions():
    """Manage vendor commissions"""
    try:
        commissions = pg_db.execute_query(
            """SELECT c.*, v.store_name, u.name, u.email FROM commissions c
               JOIN vendors v ON c.vendor_id = v.id
               JOIN users u ON v.user_id = u.id
               ORDER BY v.store_name"""
        )
        
        return render_template('admin_commissions.html', commissions=commissions)
    except Exception as e:
        flash(f"Error loading commissions: {str(e)}", "error")
        return render_template('admin_commissions.html', commissions=[])

@admin_bp.route('/commissions/<int:commission_id>/update', methods=['POST'])
@admin_required
def update_commission(commission_id):
    """Update commission percentage"""
    try:
        percentage = float(request.form.get('percentage', 5.00))
        
        if percentage < 0 or percentage > 100:
            flash("Commission must be between 0 and 100", "error")
            return redirect(url_for('admin.commissions'))
        
        pg_db.execute_query(
            "UPDATE commissions SET percentage = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
            (percentage, commission_id)
        )
        
        flash("Commission updated successfully", "success")
        return redirect(url_for('admin.commissions'))
    except Exception as e:
        flash(f"Error updating commission: {str(e)}", "error")
        return redirect(url_for('admin.commissions'))

@admin_bp.route('/orders')
@admin_required
def orders():
    """View all orders"""
    try:
        orders = pg_db.execute_query(
            """SELECT o.*, u.name, u.email FROM orders o
               JOIN users u ON o.user_id = u.id
               ORDER BY o.created_at DESC"""
        )
        
        return render_template('admin_orders.html', orders=orders)
    except Exception as e:
        flash(f"Error loading orders: {str(e)}", "error")
        return render_template('admin_orders.html', orders=[])

@admin_bp.route('/reports')
@admin_required
def reports():
    """View reports and analytics"""
    try:
        # Top products by sales
        top_products = pg_db.execute_query(
            """SELECT product_id, SUM(quantity) as total_sold, SUM(price * quantity) as revenue
               FROM order_items
               GROUP BY product_id
               ORDER BY revenue DESC
               LIMIT 10"""
        )
        
        # Top vendors
        top_vendors = pg_db.execute_query(
            """SELECT v.store_name, COUNT(DISTINCT o.id) as orders, SUM(oi.price * oi.quantity) as revenue
               FROM vendors v
               LEFT JOIN order_items oi ON v.id = oi.vendor_id
               LEFT JOIN orders o ON oi.order_id = o.id
               GROUP BY v.id, v.store_name
               ORDER BY revenue DESC
               LIMIT 10"""
        )
        
        # Sales by status
        sales_by_status = pg_db.execute_query(
            """SELECT status, COUNT(*) as count FROM orders GROUP BY status"""
        )
        
        return render_template('admin_reports.html',
                             top_products=top_products,
                             top_vendors=top_vendors,
                             sales_by_status=sales_by_status)
    except Exception as e:
        flash(f"Error loading reports: {str(e)}", "error")
        return render_template('admin_reports.html',
                             top_products=[],
                             top_vendors=[],
                             sales_by_status=[])
