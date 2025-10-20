import { Navigation } from "~/components/Navigation";

export function meta() {
  return [
    { title: "Dashboard" },
    { name: "description", content: "Admin dashboard overview" },
  ];
}

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Total Charge Points</h2>
              <p className="text-3xl font-bold text-blue-600">24</p>
              <p className="text-gray-600 mt-2">Active: 18, Inactive: 6</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Total Users</h2>
              <p className="text-3xl font-bold text-green-600">142</p>
              <p className="text-gray-600 mt-2">Active this month: 89</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Energy Consumed</h2>
              <p className="text-3xl font-bold text-purple-600">1,247 kWh</p>
              <p className="text-gray-600 mt-2">This month: 1,247 kWh</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Revenue</h2>
              <p className="text-3xl font-bold text-yellow-600">$3,456</p>
              <p className="text-gray-600 mt-2">This month: $3,456</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Active Sessions</h2>
              <p className="text-3xl font-bold text-red-600">7</p>
              <p className="text-gray-600 mt-2">Currently charging</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">System Status</h2>
              <p className="text-3xl font-bold text-green-600">Healthy</p>
              <p className="text-gray-600 mt-2">All systems operational</p>
            </div>
          </div>
          
          <div className="mt-8 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Activity</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium">Charge Point CP-001 started charging</p>
                  <p className="text-sm text-gray-600">User: John Doe - 2 minutes ago</p>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">Active</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium">New user registered</p>
                  <p className="text-sm text-gray-600">Jane Smith - 15 minutes ago</p>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">User</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Charge Point CP-003 maintenance completed</p>
                  <p className="text-sm text-gray-600">Technician: Mike Johnson - 1 hour ago</p>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">Maintenance</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}