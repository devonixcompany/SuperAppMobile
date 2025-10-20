import { Link } from "react-router";

export function Navigation() {
  return (
    <nav className="bg-white shadow-md p-4 mb-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Home
          </Link>
          <Link
            to="/charge-points"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Charge Points
          </Link>
          <Link
            to="/charge-points/add"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Add Charge Point
          </Link>
          <Link
            to="/dashboard"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            to="/users"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Users
          </Link>
          <Link
            to="/settings"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Settings
          </Link>
        </div>
      </div>
    </nav>
  );
}