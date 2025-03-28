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

    // Add product to cart
    const addToCart = (product) => {
        if (product.quantity === 0) return; // Prevent adding out-of-stock products

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

        try {
            const res = await axios.post("http://localhost:5146/api/checkout", {
                items,
                cashPaid: parseFloat(cashPaid),
            });

            setChange(res.data.change);
            setCart({});
            setCashPaid("");
        } catch (err) {
            setError(err.response?.data || "Checkout failed");
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

            {change !== null && (
                <p>Change: {change.toFixed(2)} €</p>
            )}

            {error && <p style={{ color: "red" }}>{typeof error === 'string' ? error : 'An error occurred'}</p>}
        </div>
    );
}

export default App;
