"""
PostgreSQL Database Connection Module
Handles all relational data: users, vendors, orders, payments, etc.
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

class PostgresDB:
    """Singleton class for PostgreSQL connection"""
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PostgresDB, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self.db_url = os.getenv('SUPABASE_DB_URL')
        self.conn = None
        self._initialized = True
    
    def _connect(self):
        """Establish database connection"""
        try:
            self.conn = psycopg2.connect(self.db_url)
            print("✓ Connected to PostgreSQL (Supabase)")
        except Exception as e:
            print(f"✗ PostgreSQL Connection Error: {e}")
            raise
    
    def get_connection(self):
        """Get active connection"""
        if self.conn is None or self.conn.closed:
            self._connect()
        return self.conn
    
    def execute_query(self, query, params=None, fetch_one=False):
        """Execute query and return results"""
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cursor.execute(query, params or ())
            if query.strip().upper().startswith('SELECT'):
                return cursor.fetchone() if fetch_one else cursor.fetchall()
            conn.commit()
            return cursor.lastrowid if 'INSERT' in query.upper() else True
        except Exception as e:
            conn.rollback()
            print(f"Database Error: {e}")
            raise
        finally:
            cursor.close()
    
    def execute_transaction(self, queries):
        """Execute multiple queries in a transaction"""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            for query, params in queries:
                cursor.execute(query, params or ())
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            print(f"Transaction Error: {e}")
            raise
        finally:
            cursor.close()
    
    def close(self):
        """Close connection"""
        if self.conn:
            self.conn.close()
            print("✓ Disconnected from PostgreSQL")

# Global instance
pg_db = PostgresDB()
