import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css"; // Optional CSS for styling

function App() {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState(() => {
        const savedCart = sessionStorage.getItem("cart");
        return savedCart ? JSON.parse(savedCart) : {};
    });
    const [total, setTotal] = useState(0);
    const [cashPaid, setCashPaid] = useState("");
    const [change, setChange] = useState(null);
    const [error, setError] = useState("");

    // Fetch products from backend
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await axios.get("http://localhost:8080/api/Products");
                setProducts(response.data);
            } catch (error) {
                console.error("Error fetching products:", error);
                setError("Failed to load products");
            }
        };

        fetchProducts();
    }, []);

    // Save cart to sessionStorage when it changes
    useEffect(() => {
        sessionStorage.setItem("cart", JSON.stringify(cart));
    }, [cart]);

    // Generate or get the transaction ID from sessionStorage
    const getTransactionId = () => {
        let transactionId = sessionStorage.getItem('transactionId');
        if (!transactionId) {
            transactionId = `txn_${Math.random().toString(36).substring(2)}_${Date.now()}`;
            sessionStorage.setItem('transactionId', transactionId);
        }
        return transactionId;
    };

    // Function to handle adding products to the cart
    const addToCart = async (product) => {
      const sessionId = getTransactionId();
  
      // Prevent adding to cart if product is out of stock
      if (product.quantity === 0) {
          alert("This product is out of stock!");
          return;
      }
  
      try {
          // Call the backend to add the product to the cart
          const res = await axios.post("http://localhost:8080/api/Products/add-to-cart", {
              sessionId,
              productId: product.id,
          });
  
          // Assuming the backend response contains the updated remaining stock
          const updatedStock = res.data.remainingQuantity;
  
          // Update the product stock in the frontend after receiving the backend response
          setProducts((prevProducts) => {
              return prevProducts.map((p) =>
                  p.id === product.id ? { ...p, quantity: updatedStock } : p
              );
          });
  
          // Update the cart state with the newly added product
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
  
      } catch (err) {
          console.error(err);
          const message = err.response?.data?.message || "Could not add product to cart";
          alert(message);
        }
    };


    // Calculate total whenever cart changes
    useEffect(() => {
        const newTotal = Object.values(cart).reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );
        setTotal(newTotal);
    }, [cart]);

    // Handle checkout logic
    const handleCheckout = async () => {
        const items = Object.values(cart).map((item) => ({
            productId: item.id,
            quantity: item.quantity,
        }));

        const sessionId = getTransactionId();

        try {
            const res = await axios.post("http://localhost:8080/api/products/checkout", {
                items,
                cashPaid: parseFloat(cashPaid),
                sessionId,
            });

            setChange(res.data.change);
            setCart({});
            sessionStorage.removeItem("cart");
            setCashPaid("");
        } catch (err) {
            setError(err.response?.data || "Checkout failed");
        }
    };

    // Handle transaction reset (in case of cancellation)
    const handleReset = async () => {
        const sessionId = getTransactionId();

        try {
            const res = await axios.get(`http://localhost:8080/api/products/transaction-id/${sessionId}`);
            const transactionId = res.data.transactionId;

            await axios.post(`http://localhost:8080/api/products/reset/${transactionId}`);

            setCart({});
            sessionStorage.removeItem("cart");
            setChange(null);
            setCashPaid("");
            setError("");

            const refreshed = await axios.get("http://localhost:8080/api/products");
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
                src={`${product.imageUrl}`}
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

        <button onClick={handleCheckout} disabled={!cashPaid || total === 0}  style={{ marginLeft: "1rem"}}>
          Checkout
        </button>

        <button onClick={handleReset} style={{ marginLeft: "1rem", backgroundColor: "red" }}>
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
