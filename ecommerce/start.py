#!/usr/bin/env python3
"""
VendorHub E-Commerce Platform - Startup Script
Starts both backend (Node.js) and frontend (React Vite) servers
Provides access to all 3 login routes: Customer, Vendor, Admin
"""

import os
import sys
import subprocess
import time
import platform
import signal
import webbrowser
from pathlib import Path

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_header():
    """Print welcome message"""
    print("\n" + "=" * 70)
    print(f"{Colors.GREEN}{Colors.BOLD}🚀 VendorHub - Multi-Vendor E-Commerce Platform{Colors.ENDC}")
    print("=" * 70)
    print()

def check_node_installed():
    """Check if Node.js is installed"""
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"{Colors.GREEN}✅ Node.js {result.stdout.strip()} detected{Colors.ENDC}")
            return True
    except:
        pass
    
    print(f"{Colors.RED}❌ Node.js not found. Please install Node.js v18+{Colors.ENDC}")
    return False

def install_dependencies(backend_dir, frontend_dir):
    """Install npm dependencies if needed"""
    print(f"\n{Colors.CYAN}📦 Checking dependencies...{Colors.ENDC}")
    
    # Backend dependencies
    backend_node_modules = Path(backend_dir) / "node_modules"
    if not backend_node_modules.exists():
        print(f"{Colors.CYAN}📦 Installing backend dependencies...{Colors.ENDC}")
        os.chdir(backend_dir)
        result = subprocess.run(['npm', 'install', '--legacy-peer-deps'], capture_output=True, text=True)
        if result.returncode != 0:
            print(f"{Colors.RED}❌ Failed to install backend dependencies{Colors.ENDC}")
            print(result.stderr)
            return False
        print(f"{Colors.GREEN}   ✅ Backend dependencies installed{Colors.ENDC}")
    else:
        print(f"{Colors.GREEN}   ✅ Backend dependencies already installed{Colors.ENDC}")
    
    # Frontend dependencies
    frontend_node_modules = Path(frontend_dir) / "node_modules"
    if not frontend_node_modules.exists():
        print(f"{Colors.CYAN}📦 Installing frontend dependencies...{Colors.ENDC}")
        os.chdir(frontend_dir)
        result = subprocess.run(['npm', 'install', '--legacy-peer-deps'], capture_output=True, text=True)
        if result.returncode != 0:
            print(f"{Colors.RED}❌ Failed to install frontend dependencies{Colors.ENDC}")
            print(result.stderr)
            return False
        print(f"{Colors.GREEN}   ✅ Frontend dependencies installed{Colors.ENDC}")
    else:
        print(f"{Colors.GREEN}   ✅ Frontend dependencies already installed{Colors.ENDC}")
    
    return True

def start_servers(backend_dir, frontend_dir):
    """Start backend and frontend servers"""
    print(f"\n{Colors.CYAN}🔄 Starting servers...{Colors.ENDC}\n")
    
    # Start backend
    os.chdir(backend_dir)
    print(f"{Colors.BLUE}Starting Backend Server...{Colors.ENDC}")
    backend_process = subprocess.Popen(
        ['npm', 'start'],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    print(f"{Colors.GREEN}✅ Backend started (PID: {backend_process.pid}){Colors.ENDC}")
    
    # Wait for backend to be ready
    time.sleep(3)
    
    # Start frontend
    os.chdir(frontend_dir)
    print(f"{Colors.BLUE}Starting Frontend Server...{Colors.ENDC}")
    frontend_process = subprocess.Popen(
        ['npm', 'run', 'dev'],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    print(f"{Colors.GREEN}✅ Frontend started (PID: {frontend_process.pid}){Colors.ENDC}")
    
    return backend_process, frontend_process

def display_info():
    """Display application info"""
    print("\n" + "=" * 70)
    print(f"{Colors.GREEN}{Colors.BOLD}✅ APPLICATION READY!{Colors.ENDC}")
    print("=" * 70)
    print()
    
    print(f"{Colors.CYAN}📱 LOGIN PAGES:{Colors.ENDC}")
    print(f"   {Colors.YELLOW}👤  Customer:  {Colors.ENDC}http://localhost:4000/customer/login")
    print(f"   {Colors.YELLOW}🏪  Vendor:    {Colors.ENDC}http://localhost:4000/vendor/login")
    print(f"   {Colors.YELLOW}👨‍💼 Admin:     {Colors.ENDC}http://localhost:4000/admin/login")
    print()
    
    print(f"{Colors.CYAN}🖥️  SERVERS:{Colors.ENDC}")
    print(f"   {Colors.YELLOW}Backend API:  {Colors.ENDC}http://localhost:4000")
    print(f"   {Colors.YELLOW}Frontend UI:  {Colors.ENDC}http://localhost:3000")
    print()
    
    print(f"{Colors.CYAN}🔐 TEST CREDENTIALS:{Colors.ENDC}")
    print(f"   {Colors.YELLOW}Email:    {Colors.ENDC}customer@example.com (or vendor/admin)")
    print(f"   {Colors.YELLOW}Password: {Colors.ENDC}password123")
    print()
    
    print("=" * 70)
    print(f"{Colors.YELLOW}Press Ctrl+C to stop the servers{Colors.ENDC}")
    print("=" * 70)
    print()

def main():
    """Main entry point"""
    print_header()
    
    # Get project root
    script_dir = Path(__file__).parent.absolute()
    backend_dir = script_dir / "backend"
    frontend_dir = script_dir / "frontend"
    
    print(f"{Colors.CYAN}📁 Project Root: {script_dir}{Colors.ENDC}\n")
    
    # Check Node.js
    if not check_node_installed():
        sys.exit(1)
    
    # Install dependencies
    if not install_dependencies(str(backend_dir), str(frontend_dir)):
        sys.exit(1)
    
    # Start servers
    try:
        backend_process, frontend_process = start_servers(str(backend_dir), str(frontend_dir))
        
        # Display info
        display_info()
        
        # Open browser (optional)
        try:
            webbrowser.open('http://localhost:4000/customer/login')
        except:
            pass
        
        # Keep processes running
        while True:
            time.sleep(1)
            if backend_process.poll() is not None:
                print(f"{Colors.RED}❌ Backend process terminated{Colors.ENDC}")
                break
            if frontend_process.poll() is not None:
                print(f"{Colors.RED}❌ Frontend process terminated{Colors.ENDC}")
                break
    
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}⏹️  Stopping servers...{Colors.ENDC}")
        try:
            backend_process.terminate()
            frontend_process.terminate()
            backend_process.wait(timeout=5)
            frontend_process.wait(timeout=5)
        except:
            backend_process.kill()
            frontend_process.kill()
        print(f"{Colors.GREEN}✅ Servers stopped{Colors.ENDC}")
        sys.exit(0)

if __name__ == '__main__':
    main()
