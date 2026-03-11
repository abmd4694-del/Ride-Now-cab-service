import requests
import json
import uuid
import time
from datetime import datetime

# Base URL from environment
BASE_URL = "https://realtime-rides-3.preview.emergentagent.com/api"

class UberCloneAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_data = {}
        
    def log_test(self, test_name, success, details=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL" 
        print(f"{status} | {test_name}")
        if details:
            print(f"    Details: {details}")
        if not success:
            print(f"    Error occurred in: {test_name}")
        print("-" * 60)
        
    def test_health_check(self):
        """Test GET /api/status - Health Check"""
        try:
            response = self.session.get(f"{self.base_url}/status")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['status', 'timestamp', 'version']
                
                if all(field in data for field in required_fields):
                    if data['status'] == 'healthy':
                        self.log_test("Health Check", True, f"API is healthy, version: {data['version']}")
                        return True
                    else:
                        self.log_test("Health Check", False, f"API status is not healthy: {data['status']}")
                        return False
                else:
                    self.log_test("Health Check", False, f"Missing required fields in response: {data}")
                    return False
            else:
                self.log_test("Health Check", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {str(e)}")
            return False
    
    def test_create_user(self):
        """Test POST /api/users - Create User"""
        try:
            # Create rider
            rider_data = {
                "id": str(uuid.uuid4()),
                "email": "jane.smith@rideshare.com",
                "name": "Jane Smith",
                "phone": "+1234567890",
                "user_type": "rider"
            }
            
            response = self.session.post(f"{self.base_url}/users", json=rider_data)
            
            if response.status_code == 200:
                user = response.json()
                required_fields = ['id', 'email', 'name', 'user_type', 'rating', 'total_rides']
                
                if all(field in user for field in required_fields):
                    self.test_data['rider'] = user
                    self.log_test("Create Rider User", True, f"Created rider: {user['name']} ({user['id']})")
                    rider_success = True
                else:
                    self.log_test("Create Rider User", False, f"Missing fields in response: {user}")
                    rider_success = False
            else:
                self.log_test("Create Rider User", False, f"HTTP {response.status_code}: {response.text}")
                rider_success = False
            
            # Create driver
            driver_data = {
                "id": str(uuid.uuid4()),
                "email": "mike.jones@rideshare.com", 
                "name": "Mike Jones",
                "phone": "+1987654321",
                "user_type": "driver"
            }
            
            response = self.session.post(f"{self.base_url}/users", json=driver_data)
            
            if response.status_code == 200:
                user = response.json()
                required_fields = ['id', 'email', 'name', 'user_type', 'rating', 'total_rides']
                
                if all(field in user for field in required_fields):
                    self.test_data['driver'] = user
                    self.log_test("Create Driver User", True, f"Created driver: {user['name']} ({user['id']})")
                    driver_success = True
                else:
                    self.log_test("Create Driver User", False, f"Missing fields in response: {user}")
                    driver_success = False
            else:
                self.log_test("Create Driver User", False, f"HTTP {response.status_code}: {response.text}")
                driver_success = False
                
            return rider_success and driver_success
            
        except Exception as e:
            self.log_test("Create User", False, f"Exception: {str(e)}")
            return False
    
    def test_get_user(self):
        """Test GET /api/users/:id - Get User by ID"""
        try:
            if 'rider' not in self.test_data:
                self.log_test("Get User", False, "No rider created in previous test")
                return False
                
            user_id = self.test_data['rider']['id']
            response = self.session.get(f"{self.base_url}/users/{user_id}")
            
            if response.status_code == 200:
                user = response.json()
                if user['id'] == user_id and user['email'] == self.test_data['rider']['email']:
                    self.log_test("Get User by ID", True, f"Retrieved user: {user['name']}")
                    return True
                else:
                    self.log_test("Get User by ID", False, f"User data mismatch: {user}")
                    return False
            elif response.status_code == 404:
                self.log_test("Get User by ID", False, f"User not found: {response.text}")
                return False
            else:
                self.log_test("Get User by ID", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get User by ID", False, f"Exception: {str(e)}")
            return False
    
    def test_update_user(self):
        """Test PATCH /api/users/:id - Update User"""
        try:
            if 'rider' not in self.test_data:
                self.log_test("Update User", False, "No rider created in previous test")
                return False
                
            user_id = self.test_data['rider']['id']
            update_data = {
                "phone": "+1555999888",
                "name": "Jane Smith Updated"
            }
            
            response = self.session.patch(f"{self.base_url}/users/{user_id}", json=update_data)
            
            if response.status_code == 200:
                user = response.json()
                if user['phone'] == update_data['phone'] and user['name'] == update_data['name']:
                    self.test_data['rider'] = user  # Update test data
                    self.log_test("Update User", True, f"Updated user: {user['name']}")
                    return True
                else:
                    self.log_test("Update User", False, f"Update failed, data: {user}")
                    return False
            else:
                self.log_test("Update User", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Update User", False, f"Exception: {str(e)}")
            return False
    
    def test_create_ride(self):
        """Test POST /api/rides - Create Ride"""
        try:
            if 'rider' not in self.test_data:
                self.log_test("Create Ride", False, "No rider created in previous test")
                return False
                
            ride_data = {
                "rider_id": self.test_data['rider']['id'],
                "pickup_location": {"lat": 40.7128, "lng": -74.0060},
                "dropoff_location": {"lat": 40.7589, "lng": -73.9851}, 
                "pickup_address": "Wall Street, New York, NY",
                "dropoff_address": "Times Square, New York, NY",
                "car_type": "premium",
                "estimated_fare": 25.50,
                "estimated_time": 15
            }
            
            response = self.session.post(f"{self.base_url}/rides", json=ride_data)
            
            if response.status_code == 200:
                ride = response.json()
                required_fields = ['id', 'rider_id', 'pickup_location', 'dropoff_location', 'status', 'estimated_fare']
                
                if all(field in ride for field in required_fields):
                    if ride['status'] == 'requested' and ride['rider_id'] == self.test_data['rider']['id']:
                        self.test_data['ride'] = ride
                        self.log_test("Create Ride", True, f"Created ride: {ride['id']}, fare: ${ride['estimated_fare']}")
                        return True
                    else:
                        self.log_test("Create Ride", False, f"Invalid ride status or rider_id: {ride}")
                        return False
                else:
                    self.log_test("Create Ride", False, f"Missing required fields: {ride}")
                    return False
            else:
                self.log_test("Create Ride", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Create Ride", False, f"Exception: {str(e)}")
            return False
    
    def test_get_rides(self):
        """Test GET /api/rides - Get All Rides"""
        try:
            # Test get all rides
            response = self.session.get(f"{self.base_url}/rides")
            
            if response.status_code == 200:
                rides = response.json()
                if isinstance(rides, list) and len(rides) > 0:
                    self.log_test("Get All Rides", True, f"Retrieved {len(rides)} rides")
                    all_rides_success = True
                else:
                    self.log_test("Get All Rides", False, f"No rides returned or invalid format: {rides}")
                    all_rides_success = False
            else:
                self.log_test("Get All Rides", False, f"HTTP {response.status_code}: {response.text}")
                all_rides_success = False
            
            # Test get rides with status filter
            if 'ride' in self.test_data:
                response = self.session.get(f"{self.base_url}/rides?status=requested")
                
                if response.status_code == 200:
                    rides = response.json()
                    if isinstance(rides, list):
                        requested_rides = [r for r in rides if r['status'] == 'requested']
                        if len(requested_rides) > 0:
                            self.log_test("Get Rides by Status", True, f"Found {len(requested_rides)} requested rides")
                            status_filter_success = True
                        else:
                            self.log_test("Get Rides by Status", False, "No requested rides found")
                            status_filter_success = False
                    else:
                        self.log_test("Get Rides by Status", False, f"Invalid response format: {rides}")
                        status_filter_success = False
                else:
                    self.log_test("Get Rides by Status", False, f"HTTP {response.status_code}: {response.text}")
                    status_filter_success = False
            else:
                status_filter_success = False
                
            return all_rides_success and status_filter_success
            
        except Exception as e:
            self.log_test("Get Rides", False, f"Exception: {str(e)}")
            return False
    
    def test_get_active_ride(self):
        """Test GET /api/rides/active?user_id=xxx - Get Active Ride"""
        try:
            if 'rider' not in self.test_data:
                self.log_test("Get Active Ride", False, "No rider created in previous test")
                return False
                
            user_id = self.test_data['rider']['id']
            response = self.session.get(f"{self.base_url}/rides/active?user_id={user_id}")
            
            if response.status_code == 200:
                ride = response.json()
                if ride and 'id' in ride:  # Active ride exists
                    if ride['rider_id'] == user_id:
                        self.log_test("Get Active Ride", True, f"Found active ride: {ride['id']}")
                        return True
                    else:
                        self.log_test("Get Active Ride", False, f"Active ride belongs to different user: {ride}")
                        return False
                else:  # No active ride (empty object)
                    self.log_test("Get Active Ride", True, "No active ride found (valid response)")
                    return True
            else:
                self.log_test("Get Active Ride", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Active Ride", False, f"Exception: {str(e)}")
            return False
    
    def test_get_ride_by_id(self):
        """Test GET /api/rides/:id - Get Ride by ID"""
        try:
            if 'ride' not in self.test_data:
                self.log_test("Get Ride by ID", False, "No ride created in previous test")
                return False
                
            ride_id = self.test_data['ride']['id']
            response = self.session.get(f"{self.base_url}/rides/{ride_id}")
            
            if response.status_code == 200:
                ride = response.json()
                if ride['id'] == ride_id:
                    self.log_test("Get Ride by ID", True, f"Retrieved ride: {ride_id}")
                    return True
                else:
                    self.log_test("Get Ride by ID", False, f"Ride ID mismatch: {ride}")
                    return False
            elif response.status_code == 404:
                self.log_test("Get Ride by ID", False, f"Ride not found: {response.text}")
                return False
            else:
                self.log_test("Get Ride by ID", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Ride by ID", False, f"Exception: {str(e)}")
            return False
    
    def test_update_ride_status(self):
        """Test PATCH /api/rides/:id - Update Ride Status Flow"""
        try:
            if 'ride' not in self.test_data or 'driver' not in self.test_data:
                self.log_test("Update Ride Status", False, "Missing ride or driver from previous tests")
                return False
                
            ride_id = self.test_data['ride']['id']
            driver_id = self.test_data['driver']['id']
            
            # Step 1: Driver accepts ride
            accept_data = {
                "status": "accepted",
                "driver_id": driver_id,
                "driver": {
                    "id": driver_id,
                    "name": self.test_data['driver']['name'],
                    "phone": self.test_data['driver']['phone'],
                    "rating": self.test_data['driver']['rating']
                }
            }
            
            response = self.session.patch(f"{self.base_url}/rides/{ride_id}", json=accept_data)
            
            if response.status_code != 200:
                self.log_test("Update Ride - Accept", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
            ride = response.json()
            if ride['status'] != 'accepted' or ride['driver_id'] != driver_id:
                self.log_test("Update Ride - Accept", False, f"Status not updated correctly: {ride}")
                return False
                
            self.log_test("Update Ride - Accept", True, f"Driver {driver_id} accepted ride")
            
            # Step 2: Driver arrives
            arrive_data = {"status": "arrived"}
            response = self.session.patch(f"{self.base_url}/rides/{ride_id}", json=arrive_data)
            
            if response.status_code != 200:
                self.log_test("Update Ride - Arrive", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
            ride = response.json()
            if ride['status'] != 'arrived':
                self.log_test("Update Ride - Arrive", False, f"Status not updated: {ride}")
                return False
                
            self.log_test("Update Ride - Arrive", True, "Driver arrived at pickup location")
            
            # Step 3: Start trip
            start_data = {"status": "in_progress"}
            response = self.session.patch(f"{self.base_url}/rides/{ride_id}", json=start_data)
            
            if response.status_code != 200:
                self.log_test("Update Ride - Start", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
            ride = response.json()
            if ride['status'] != 'in_progress':
                self.log_test("Update Ride - Start", False, f"Status not updated: {ride}")
                return False
                
            self.log_test("Update Ride - Start", True, "Trip started")
            
            # Step 4: Complete trip
            complete_data = {"status": "completed"}
            response = self.session.patch(f"{self.base_url}/rides/{ride_id}", json=complete_data)
            
            if response.status_code != 200:
                self.log_test("Update Ride - Complete", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
            ride = response.json()
            if ride['status'] != 'completed' or not ride['completed_at']:
                self.log_test("Update Ride - Complete", False, f"Status not updated or completed_at missing: {ride}")
                return False
                
            self.test_data['ride'] = ride  # Update with completed ride
            self.log_test("Update Ride - Complete", True, "Trip completed successfully")
            
            return True
            
        except Exception as e:
            self.log_test("Update Ride Status", False, f"Exception: {str(e)}")
            return False
    
    def test_rate_ride(self):
        """Test POST /api/rides/:id/rating - Rate Ride"""
        try:
            if 'ride' not in self.test_data:
                self.log_test("Rate Ride", False, "No ride found in test data")
                return False
                
            ride_id = self.test_data['ride']['id']
            rating_data = {"rating": 4.5}
            
            response = self.session.post(f"{self.base_url}/rides/{ride_id}/rating", json=rating_data)
            
            if response.status_code == 200:
                ride = response.json()
                if ride['rating'] == 4.5:
                    self.log_test("Rate Ride", True, f"Rated ride {ride_id} with 4.5 stars")
                    return True
                else:
                    self.log_test("Rate Ride", False, f"Rating not saved correctly: {ride}")
                    return False
            else:
                self.log_test("Rate Ride", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Rate Ride", False, f"Exception: {str(e)}")
            return False
    
    def test_driver_earnings(self):
        """Test GET /api/drivers/:id/earnings - Get Driver Earnings"""
        try:
            if 'driver' not in self.test_data:
                self.log_test("Driver Earnings", False, "No driver found in test data")
                return False
                
            driver_id = self.test_data['driver']['id']
            response = self.session.get(f"{self.base_url}/drivers/{driver_id}/earnings")
            
            if response.status_code == 200:
                earnings = response.json()
                required_fields = ['today', 'total', 'rides_count']
                
                if all(field in earnings for field in required_fields):
                    self.log_test("Driver Earnings", True, f"Total earnings: ${earnings['total']}, Rides: {earnings['rides_count']}")
                    return True
                else:
                    self.log_test("Driver Earnings", False, f"Missing required fields: {earnings}")
                    return False
            else:
                self.log_test("Driver Earnings", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Driver Earnings", False, f"Exception: {str(e)}")
            return False
    
    def test_payment_checkout(self):
        """Test POST /api/payments/create-checkout - Create Stripe Checkout"""
        try:
            if 'ride' not in self.test_data:
                self.log_test("Payment Checkout", False, "No ride found in test data")
                return False
                
            checkout_data = {
                "ride_id": self.test_data['ride']['id'],
                "amount": 25.50,
                "origin_url": "https://realtime-rides-3.preview.emergentagent.com"
            }
            
            response = self.session.post(f"{self.base_url}/payments/create-checkout", json=checkout_data)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['url', 'session_id']
                
                if all(field in data for field in required_fields):
                    if 'checkout.stripe.com' in data['url']:
                        self.test_data['payment_session'] = data
                        self.log_test("Payment Checkout", True, f"Created checkout session: {data['session_id']}")
                        return True
                    else:
                        self.log_test("Payment Checkout", False, f"Invalid checkout URL: {data['url']}")
                        return False
                else:
                    self.log_test("Payment Checkout", False, f"Missing required fields: {data}")
                    return False
            else:
                self.log_test("Payment Checkout", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Payment Checkout", False, f"Exception: {str(e)}")
            return False
    
    def test_payment_status(self):
        """Test GET /api/payments/status/:session_id - Get Payment Status"""
        try:
            if 'payment_session' not in self.test_data:
                self.log_test("Payment Status", False, "No payment session found in test data")
                return False
                
            session_id = self.test_data['payment_session']['session_id']
            response = self.session.get(f"{self.base_url}/payments/status/{session_id}")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['status', 'payment_status']
                
                if all(field in data for field in required_fields):
                    self.log_test("Payment Status", True, f"Session status: {data['status']}, Payment: {data['payment_status']}")
                    return True
                else:
                    self.log_test("Payment Status", False, f"Missing required fields: {data}")
                    return False
            elif response.status_code == 404:
                self.log_test("Payment Status", False, f"Payment session not found: {response.text}")
                return False
            else:
                self.log_test("Payment Status", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Payment Status", False, f"Exception: {str(e)}")
            return False
    
    def run_complete_flow_test(self):
        """Run the complete Uber Clone flow test"""
        print("=" * 80)
        print("🚗 UBER CLONE (RIDENOW) BACKEND API TESTING")
        print("=" * 80)
        print(f"Base URL: {self.base_url}")
        print(f"Test Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)
        
        test_results = {}
        
        # Core API Tests
        test_results['health_check'] = self.test_health_check()
        test_results['create_user'] = self.test_create_user()
        test_results['get_user'] = self.test_get_user()
        test_results['update_user'] = self.test_update_user()
        
        # Ride Management Tests  
        test_results['create_ride'] = self.test_create_ride()
        test_results['get_rides'] = self.test_get_rides()
        test_results['get_active_ride'] = self.test_get_active_ride()
        test_results['get_ride_by_id'] = self.test_get_ride_by_id()
        test_results['update_ride_status'] = self.test_update_ride_status()
        test_results['rate_ride'] = self.test_rate_ride()
        
        # Additional Features
        test_results['driver_earnings'] = self.test_driver_earnings()
        test_results['payment_checkout'] = self.test_payment_checkout()
        test_results['payment_status'] = self.test_payment_status()
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for result in test_results.values() if result)
        total = len(test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        print("\n🔍 Detailed Results:")
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"  {status} | {test_name}")
        
        print("\n" + "=" * 80)
        
        if passed == total:
            print("🎉 ALL TESTS PASSED - Backend API is working correctly!")
        else:
            print(f"⚠️  {total - passed} tests failed - Backend needs attention")
            
        print("=" * 80)
        
        return test_results

if __name__ == "__main__":
    tester = UberCloneAPITester()
    results = tester.run_complete_flow_test()