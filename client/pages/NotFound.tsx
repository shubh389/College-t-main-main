import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-base text-muted-foreground mb-4">
          Oops! Page not found
        </p>
        <a
          href="/"
          className="text-indigo-600 hover:text-indigo-700 underline font-medium"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
