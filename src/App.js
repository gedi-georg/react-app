import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css"; // Optional CSS for styling

function App() {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState({});
    const [total, setTotal] = useState(0);
    const [cashPaid, setCashPaid] = useState("");
    const [change, setChange] = useState(null);
    const [error, setError] = useState("");

    // Fetch products from backend
    useEffect(() => {
        axios.get("http://localhost:5146/api/Products") // Use the correct backend URL
            .then((res) => {
                console.log(res); // Log the full response to check the structure
                setProducts(res.data); // Set the actual products data
            })
            .catch((err) => {
                console.log(err); // Log error to see the response structure
                setError("Failed to load products");
            });
    }, []);

    // Generate or get the transaction ID from sessionStorage
    const getTransactionId = () => {
        let transactionId = sessionStorage.getItem('transactionId');
        if (!transactionId) {
            transactionId = `txn_${Math.random().toString(36).substring(2)}_${Date.now()}`;
            sessionStorage.setItem('transactionId', transactionId);
        }
        return transactionId;
    };


    const addToCart = async (product) => {
      const sessionId = getTransactionId();
  
      try {
          // Send the request to add to the cart
          const res = await axios.post("http://localhost:5146/api/Products/add-to-cart", {
              sessionId,
              productId: product.id,
          });
  
          const updatedStock = res.data.remaining; // Get updated stock quantity from backend
  
          // Update cart state
          setCart((prev) => {
              const updated = { ...prev };
              if (updated[product.id]) {
                  updated[product.id].quantity += 1;
              } else {
                  updated[product.id] = {
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      quantity: 1,
                  };
              }
              return updated;
          });
  
          // Update the product stock in UI after adding it to the cart
          setProducts((prev) =>
              prev.map((p) =>
                  p.id === product.id ? { ...p, quantity: updatedStock } : p
              )
          );
  
      } catch (err) {
          console.error(err);
          const message =
              err.response?.data || "Could not add product to cart";
          alert(message);
        }
    };
  
    

    // Calculate total
    useEffect(() => {
        const newTotal = Object.values(cart).reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );
        setTotal(newTotal);
    }, [cart]);

    // Handle checkout
    const handleCheckout = async () => {
      const items = Object.values(cart).map((item) => ({
          productId: item.id,
          quantity: item.quantity,
      }));

      const sessionId = getTransactionId();

      try {
          const res = await axios.post("http://localhost:5146/api/products/checkout", {
              items,
              cashPaid: parseFloat(cashPaid),
              sessionId,
          });

          setChange(res.data.change);
          setCart({});
          setCashPaid("");
      } catch (err) {
          setError(err.response?.data || "Checkout failed");
      }
    };

    const handleReset = async () => {
      const sessionId = getTransactionId();
  
      try {
          // Hangi transactionId backendist
          const res = await axios.get(`http://localhost:5146/api/products/transaction-id/${sessionId}`);
          const transactionId = res.data.transactionId;
  
          // Tee reset-päring
          await axios.post(`http://localhost:5146/api/products/reset/${transactionId}`);
  
          // Tühjenda ostukorv ja laadige tooted uuesti
          setCart({});
          setChange(null);
          setCashPaid("");
          setError("");
  
          // Laadi uuesti tooted
          const refreshed = await axios.get("http://localhost:5146/api/products");
          setProducts(refreshed.data);
  
      } catch (err) {
          console.error(err);
          setError("Failed to reset transaction.");
        }
    };
  
  



    return (
        <div className="App">
            <h1>Charity Bake Sale & Second-Hand Store</h1>

            <div className="product-grid">
                {products.map((product) => (
                    <div
                        key={product.id}
                        className="product-card"
                        onClick={() => addToCart(product)}
                    >
                        <img
                            src={`http://localhost:5146/${product.imageUrl}`} // URL for the image in the backend
                            alt={product.name}
                            className={product.quantity === 0 ? "out-of-stock" : ""}
                        />
                        <p>{product.name}</p>
                        <p>{product.price.toFixed(2)} €</p>
                        <p>{product.quantity > 0 ? `${product.quantity} left` : "Out of stock"}</p>
                    </div>
                ))}
            </div>

            <h2>Cart</h2>
            <ul>
                {Object.values(cart).map((item) => (
                    <li key={item.id}>
                        {item.name} x{item.quantity} — {(item.price * item.quantity).toFixed(2)} €
                    </li>
                ))}
            </ul>

            <h3>Total: {total.toFixed(2)} €</h3>

            <input
                type="number"
                placeholder="Cash paid"
                value={cashPaid}
                onChange={(e) => setCashPaid(e.target.value)}
            />

            <button onClick={handleCheckout} disabled={!cashPaid || total === 0}>
                Checkout
            </button>

            <button onClick={handleReset} style={{ marginLeft: "1rem", backgroundColor: "#eee" }}>
                Reset
            </button>


            {change !== null && (
                <p>Change: {change.toFixed(2)} €</p>
            )}

            {error && <p style={{ color: "red" }}>{typeof error === 'string' ? error : 'An error occurred'}</p>}
        </div>
    );
}

export default App;
