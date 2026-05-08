"""
MongoDB Database Connection Module
Handles product catalog and reviews (document-based)
"""

from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

class MongoDBManager:
    """Singleton class for MongoDB connection"""
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MongoDBManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self.mongo_uri = os.getenv('MONGO_URI')
        self.client = None
        self.db = None
        self._initialized = True
    
    def _connect(self):
        """Establish MongoDB connection"""
        try:
            self.client = MongoClient(
                self.mongo_uri,
                serverSelectionTimeoutMS=3000,
                connectTimeoutMS=3000,
            )
            # Verify connection
            self.client.admin.command('ping')
            self.db = self.client['ecommerce']
            print("✓ Connected to MongoDB")
        except Exception as e:
            print(f"✗ MongoDB Connection Error: {e}")
            raise
    
    def get_db(self):
        """Get database instance"""
        if self.db is None:
            self._connect()
        return self.db
    
    def get_collection(self, collection_name):
        """Get specific collection"""
        return self.get_db()[collection_name]
    
    def insert_product(self, product_data):
        """Insert product into MongoDB"""
        try:
            collection = self.get_collection('products')
            result = collection.insert_one(product_data)
            return str(result.inserted_id)
        except Exception as e:
            print(f"Insert Product Error: {e}")
            raise
    
    def get_product(self, product_id):
        """Get product by MongoDB ObjectId"""
        try:
            from bson.objectid import ObjectId
            collection = self.get_collection('products')
            return collection.find_one({'_id': ObjectId(product_id)})
        except Exception as e:
            print(f"Get Product Error: {e}")
            return None
    
    def get_vendor_products(self, vendor_id):
        """Get all products by vendor"""
        try:
            collection = self.get_collection('products')
            return list(collection.find({'vendor_id': vendor_id}))
        except Exception as e:
            print(f"Get Vendor Products Error: {e}")
            return []
    
    def search_products(self, filters):
        """Search products with filters"""
        try:
            collection = self.get_collection('products')
            query = {}
            
            if 'category' in filters:
                query['category'] = filters['category']
            if 'min_price' in filters:
                query['price'] = {'$gte': filters['min_price']}
            if 'max_price' in filters:
                if 'price' in query:
                    query['price']['$lte'] = filters['max_price']
                else:
                    query['price'] = {'$lte': filters['max_price']}
            
            return list(collection.find(query).limit(100))
        except Exception as e:
            print(f"Search Products Error: {e}")
            return []
    
    def update_stock(self, product_id, quantity):
        """Deduct stock from product"""
        try:
            from bson.objectid import ObjectId
            collection = self.get_collection('products')
            collection.update_one(
                {'_id': ObjectId(product_id)},
                {'$inc': {'stock': -quantity}}
            )
            return True
        except Exception as e:
            print(f"Update Stock Error: {e}")
            return False
    
    def add_review(self, product_id, review_data):
        """Add review to product"""
        try:
            from bson.objectid import ObjectId
            collection = self.get_collection('products')
            collection.update_one(
                {'_id': ObjectId(product_id)},
                {'$push': {'reviews': review_data}}
            )
            return True
        except Exception as e:
            print(f"Add Review Error: {e}")
            return False
    
    def close(self):
        """Close connection"""
        if self.client:
            self.client.close()
            print("✓ Disconnected from MongoDB")

# Global instance
mongo_db = MongoDBManager()
