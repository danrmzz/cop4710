import { Navigate } from "react-router-dom";

export default function PrivateRoute({ children }) {
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user) {
    alert("❌ You must log in to access this page.");
    return <Navigate to="/" />;
  }

  return children;
}
