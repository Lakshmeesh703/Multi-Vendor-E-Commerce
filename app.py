"""
Multi-Vendor E-Commerce Platform
Main Flask Application File

Stack: Flask (Backend) + PostgreSQL (Supabase) + MongoDB (Product Catalog)
"""

from flask import Flask, render_template, redirect, url_for, session
from flask_session import Session
from dotenv import load_dotenv
import os
from datetime import timedelta

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SESSION_TYPE'] = 'filesystem'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

# Initialize session
Session(app)

# Register blueprints
from routes.auth import auth_bp
from routes.customer import customer_bp
from routes.vendor import vendor_bp
from routes.admin import admin_bp

app.register_blueprint(auth_bp)
app.register_blueprint(customer_bp)
app.register_blueprint(vendor_bp)
app.register_blueprint(admin_bp)

# Context processors
@app.context_processor
def inject_user():
    """Inject user into template context"""
    return dict(
        user_id=session.get('user_id'),
        user_name=session.get('user_name'),
        user_role=session.get('user_role'),
        user_email=session.get('user_email')
    )

# Error handlers
@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return render_template('error.html', 
                         error_code=404, 
                         error_message="Page not found"), 404

@app.errorhandler(500)
def server_error(error):
    """Handle 500 errors"""
    return render_template('error.html',
                         error_code=500,
                         error_message="Internal server error"), 500

@app.errorhandler(403)
def forbidden(error):
    """Handle 403 errors"""
    return render_template('error.html',
                         error_code=403,
                         error_message="Access forbidden"), 403

# Root routes
@app.route('/')
def index():
    """Redirect to home"""
    return redirect(url_for('customer.home'))

@app.route('/health')
def health():
    """Health check endpoint"""
    return {'status': 'ok', 'message': 'E-Commerce Platform is running'}

# Database initialization
def init_db():
    """Initialize database with schema"""
    from db.postgres import pg_db
    try:
        # Read and execute SQL schema
        with open('db/schema.sql', 'r') as f:
            schema = f.read()
        
        # Split by semicolon and execute each statement
        statements = schema.split(';')
        for statement in statements:
            if statement.strip():
                pg_db.execute_query(statement)
        
        print("✓ Database schema initialized")
    except FileNotFoundError:
        print("! Schema file not found - skipping auto-initialization")
    except Exception as e:
        print(f"! Error initializing database: {e}")

# Create MongoDB collections if they don't exist
def init_mongodb():
    """Initialize MongoDB collections"""
    from db.mongodb import mongo_db
    try:
        db = mongo_db.get_db()
        
        # Create products collection with schema validation
        if 'products' not in db.list_collection_names():
            db.create_collection('products')
            
            # Create indexes
            products_collection = mongo_db.get_collection('products')
            products_collection.create_index('vendor_id')
            products_collection.create_index('category')
            products_collection.create_index('name')
            products_collection.create_index([('price', 1)])
            
            print("✓ MongoDB products collection initialized")
        
    except Exception as e:
        print(f"! Error initializing MongoDB: {e}")

# Application context
@app.shell_context_processor
def make_shell_context():
    """For flask shell"""
    from db.postgres import pg_db
    from db.mongodb import mongo_db
    return {'pg_db': pg_db, 'mongo_db': mongo_db}

if __name__ == '__main__':
    print("\n" + "="*60)
    print("Multi-Vendor E-Commerce Platform")
    print("="*60)
    
    # Initialize databases
    print("\nInitializing databases...")
    init_db()
    init_mongodb()
    
    print("\n✓ Application ready!")
    print("  → Starting server at http://localhost:5000")
    print("  → Login: admin@ecommerce.com / vendor@ecommerce.com / customer@ecommerce.com")
    print("="*60 + "\n")
    
    # Run development server
    app.run(
        host='127.0.0.1',
        port=5000,
        debug=True,
        use_reloader=True
    )
