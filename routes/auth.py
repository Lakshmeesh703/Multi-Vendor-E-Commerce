"""
Authentication Routes
Handles user registration, login, and logout
"""

from flask import Blueprint, render_template, request, redirect, url_for, session, flash
from werkzeug.security import generate_password_hash, check_password_hash
from db.postgres import pg_db
import re

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

# Email validation regex
EMAIL_REGEX = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    """User registration"""
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        password_confirm = request.form.get('password_confirm', '')
        role = request.form.get('role', 'customer')
        
        # Validation
        errors = []
        
        if not name or len(name) < 3:
            errors.append("Name must be at least 3 characters")
        
        if not email or not re.match(EMAIL_REGEX, email):
            errors.append("Valid email is required")
        
        if not password or len(password) < 6:
            errors.append("Password must be at least 6 characters")
        
        if password != password_confirm:
            errors.append("Passwords do not match")
        
        if role not in ['customer', 'vendor']:
            errors.append("Invalid role selected")
        
        # Check if email exists
        try:
            existing_user = pg_db.execute_query(
                "SELECT id FROM users WHERE email = %s",
                (email,),
                fetch_one=True
            )
            if existing_user:
                errors.append("Email already registered")
        except Exception as e:
            flash(f"Database error: {str(e)}", "error")
            return redirect(url_for('auth.register'))
        
        if errors:
            for error in errors:
                flash(error, "error")
            return redirect(url_for('auth.register'))
        
        # Create user
        try:
            hashed_password = generate_password_hash(password)
            pg_db.execute_query(
                "INSERT INTO users (name, email, password, role) VALUES (%s, %s, %s, %s)",
                (name, email, hashed_password, role)
            )
            
            # If vendor, create vendor record
            if role == 'vendor':
                user = pg_db.execute_query(
                    "SELECT id FROM users WHERE email = %s",
                    (email,),
                    fetch_one=True
                )
                store_name = request.form.get('store_name', 'My Store').strip()
                pg_db.execute_query(
                    "INSERT INTO vendors (user_id, store_name, approval_status) VALUES (%s, %s, %s)",
                    (user['id'], store_name, 'pending')
                )
                # Create commission record
                pg_db.execute_query(
                    "INSERT INTO commissions (vendor_id, percentage) VALUES (%s, %s)",
                    (user['id'], 5.00)
                )
            
            flash("Registration successful! Please login.", "success")
            return redirect(url_for('auth.login'))
        
        except Exception as e:
            flash(f"Registration error: {str(e)}", "error")
            return redirect(url_for('auth.register'))
    
    return render_template('register.html')

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """User login"""
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        
        if not email or not password:
            flash("Email and password are required", "error")
            return redirect(url_for('auth.login'))
        
        try:
            user = pg_db.execute_query(
                "SELECT * FROM users WHERE email = %s",
                (email,),
                fetch_one=True
            )
            
            if not user or not check_password_hash(user['password'], password):
                flash("Invalid email or password", "error")
                return redirect(url_for('auth.login'))
            
            # Create session
            session['user_id'] = user['id']
            session['user_name'] = user['name']
            session['user_role'] = user['role']
            session['user_email'] = user['email']
            
            flash(f"Welcome back, {user['name']}!", "success")
            
            # Redirect based on role
            if user['role'] == 'admin':
                return redirect(url_for('admin.dashboard'))
            elif user['role'] == 'vendor':
                return redirect(url_for('vendor.dashboard'))
            else:
                return redirect(url_for('customer.home'))
        
        except Exception as e:
            flash(f"Login error: {str(e)}", "error")
            return redirect(url_for('auth.login'))
    
    return render_template('login.html')

@auth_bp.route('/logout')
def logout():
    """User logout"""
    session.clear()
    flash("You have been logged out.", "success")
    return redirect(url_for('customer.home'))

def login_required(role=None):
    """Decorator to check if user is logged in"""
    from functools import wraps
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                flash("Please login first", "error")
                return redirect(url_for('auth.login'))
            
            if role and session.get('user_role') != role:
                flash("Unauthorized access", "error")
                return redirect(url_for('customer.home'))
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator
