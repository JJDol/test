export default function Unauthorized() {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-center mb-6">
          You are not authorized to access this application. 
          This is a limited test deployment available only to authorized users.
        </p>
        <p className="text-sm text-gray-500">
          If you believe you should have access, please contact the administrator.
        </p>
      </div>
    );
  }