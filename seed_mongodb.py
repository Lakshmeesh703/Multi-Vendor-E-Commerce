"""
MongoDB Schema Example and Sample Data
Run this to seed initial products into MongoDB
"""

from db.mongodb import mongo_db

def seed_products():
    """Seed sample products to MongoDB"""
    
    sample_products = [
        {
            'vendor_id': 1,
            'name': 'MacBook Pro 14"',
            'category': 'Laptops',
            'price': 1999.99,
            'stock': 10,
            'description': 'Powerful laptop with M3 Pro chip',
            'attributes': {
                'processor': 'Apple M3 Pro',
                'ram': '16GB',
                'storage': '512GB SSD',
                'display': '14-inch Liquid Retina X'
            },
            'reviews': [
                {
                    'user_id': 2,
                    'rating': 5,
                    'comment': 'Excellent product!',
                    'created_at': '2024-01-15'
                }
            ]
        },
        {
            'vendor_id': 1,
            'name': 'iPhone 15 Pro',
            'category': 'Mobile Phones',
            'price': 999.99,
            'stock': 25,
            'description': 'Latest iPhone with advanced features',
            'attributes': {
                'processor': 'A17 Pro',
                'ram': '8GB',
                'storage': '256GB',
                'display': '6.1-inch Super Retina XDR'
            },
            'reviews': []
        },
        {
            'vendor_id': 1,
            'name': 'iPad Air',
            'category': 'Tablets',
            'price': 599.99,
            'stock': 15,
            'description': 'Versatile tablet for work and entertainment',
            'attributes': {
                'processor': 'Apple M1',
                'ram': '8GB',
                'storage': '256GB',
                'display': '10.9-inch Liquid Retina'
            },
            'reviews': []
        },
        {
            'vendor_id': 2,
            'name': 'Samsung Galaxy S24',
            'category': 'Mobile Phones',
            'price': 899.99,
            'stock': 20,
            'description': 'Premium Android smartphone',
            'attributes': {
                'processor': 'Snapdragon 8 Gen 3',
                'ram': '12GB',
                'storage': '256GB',
                'display': '6.2-inch AMOLED'
            },
            'reviews': []
        },
        {
            'vendor_id': 2,
            'name': 'Dell XPS 15',
            'category': 'Laptops',
            'price': 1499.99,
            'stock': 8,
            'description': 'Premium Windows laptop',
            'attributes': {
                'processor': 'Intel Core i9',
                'ram': '32GB',
                'storage': '1TB SSD',
                'display': '15.6-inch 4K OLED'
            },
            'reviews': []
        }
    ]
    
    collection = mongo_db.get_collection('products')
    
    # Clear existing products
    collection.delete_many({})
    
    # Insert sample products
    result = collection.insert_many(sample_products)
    
    print(f"✓ Inserted {len(result.inserted_ids)} sample products")
    
    # Create indexes
    try:
        collection.create_index('vendor_id')
        collection.create_index('category')
        collection.create_index('name')
        collection.create_index([('price', 1)])
        print("✓ Created MongoDB indexes")
    except Exception as e:
        print(f"! Index creation note: {e}")

if __name__ == '__main__':
    print("Seeding MongoDB with sample products...")
    seed_products()
    print("Done!")
