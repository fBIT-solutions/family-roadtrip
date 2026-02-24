import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function APITest() {
  const { data: session, status } = useSession();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    try {
      console.log("Testing /api/user/preferences");
      const response = await fetch("/api/user/preferences", {
        method: "GET",
        credentials: "include",
      });
      console.log("Response status:", response.status);
      const data = await response.json();
      setResult({ status: response.status, data });
    } catch (error) {
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>API Diagnostic Test</h1>
      <p>Session Status: {status}</p>
      <p>Authenticated: {session?.user?.email || "No"}</p>
      <p>User Email: {session?.user?.email}</p>

      <button onClick={testAPI} disabled={loading}>
        {loading ? "Testing..." : "Test /api/user/preferences"}
      </button>

      {result && (
        <pre style={{ marginTop: "20px", backgroundColor: "#f5f5f5", padding: "10px" }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
