const coins = ["bitcoin", "ethereum", "dogecoin", "solana", "cardano", "litecoin", "gold", "silver"];
let currency = "usd";
let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
let portfolio = JSON.parse(localStorage.getItem("portfolio")) || {};
let priceAlerts = JSON.parse(localStorage.getItem("priceAlerts")) || {};

const container = document.getElementById("cryptoContainer");
const searchInput = document.getElementById("search");
const currencySelect = document.getElementById("currency");

currencySelect.addEventListener("change", () => {
  currency = currencySelect.value;
  fetchCrypto();
});

searchInput.addEventListener("input", () => {
  displayCoins(latestData);
});

let latestData = [];

async function fetchCrypto() {
  container.innerHTML = "<p>Loading...</p>";
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency}&ids=${coins.join(",")}`;
  const res = await fetch(url);
  latestData = await res.json();
  checkPriceAlerts();
  displayCoins(latestData);
}

function checkPriceAlerts() {
  latestData.forEach(coin => {
    const alerts = priceAlerts[coin.id] || [];
    alerts.forEach(alert => {
      if ((alert.type === "above" && coin.current_price >= alert.price) ||
          (alert.type === "below" && coin.current_price <= alert.price)) {
        alert(`🚨 Price Alert: ${coin.name} is ${alert.type === "above" ? "above" : "below"} ${currency === "usd" ? "$" : "₹"}${alert.price}`);
        priceAlerts[coin.id] = alerts.filter(a => a.price !== alert.price);
        localStorage.setItem("priceAlerts", JSON.stringify(priceAlerts));
      }
    });
  });
}

function displayCoins(data) {
  const searchValue = searchInput.value.toLowerCase();
  container.innerHTML = "";

  // Show portfolio summary if available
  if (Object.keys(portfolio).length > 0) {
    const portfolioDiv = document.createElement("div");
    portfolioDiv.className = "portfolio-summary";
    let totalValue = 0;
    
    Object.keys(portfolio).forEach(coinId => {
      const coin = data.find(c => c.id === coinId);
      if (coin) {
        totalValue += coin.current_price * portfolio[coinId];
      }
    });
    
    portfolioDiv.innerHTML = `<h3>💼 Portfolio Value: ${currency === "usd" ? "$" : "₹"}${totalValue.toFixed(2)}</h3>`;
    container.appendChild(portfolioDiv);
  }

  // Show top gainers and losers
  const sorted = [...data].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
  const topGainers = sorted.slice(0, 3);
  const topLosers = sorted.slice(-3).reverse();

  const statsDiv = document.createElement("div");
  statsDiv.className = "stats-container";
  statsDiv.innerHTML = `
    <div class="stat-box gainers">
      <h4>🚀 Top Gainers</h4>
      ${topGainers.map(c => `<span>${c.name}: +${c.price_change_percentage_24h.toFixed(2)}%</span>`).join("")}
    </div>
    <div class="stat-box losers">
      <h4>📉 Top Losers</h4>
      ${topLosers.map(c => `<span>${c.name}: ${c.price_change_percentage_24h.toFixed(2)}%</span>`).join("")}
    </div>
  `;
  container.appendChild(statsDiv);

  // Display individual coins
  const coinsDiv = document.createElement("div");
  coinsDiv.className = "coins-grid";

  data
    .filter(coin => coin.name.toLowerCase().includes(searchValue))
    .forEach(coin => {
      const card = document.createElement("div");
      card.className = "card";
      const isFavorite = favorites.includes(coin.id);
      const change = coin.price_change_percentage_24h;
      const sentiment = change > 5 ? "🔥" : change > 0 ? "📈" : change < -5 ? "❄️" : "📉";
      const volatility = Math.abs(change);
      const volatilityLevel = volatility > 10 ? "🌪️ High" : volatility > 5 ? "⚡ Medium" : "😌 Low";
      
      const portfolioAmount = portfolio[coin.id] || 0;
      const portfolioValue = portfolioAmount > 0 ? portfolioAmount * coin.current_price : 0;

      card.innerHTML = `
        <div class="card-header">
          <h2>${coin.name} <span class="favorite-btn ${isFavorite ? "active" : ""}" onclick="toggleFavorite('${coin.id}')">★</span></h2>
          <span class="sentiment">${sentiment}</span>
        </div>
        <div class="price">${currency === "usd" ? "$" : "₹"}${coin.current_price.toFixed(2)}</div>
        <div class="change" style="color: ${change >= 0 ? "#51cf66" : "#ff6b6b"}">
          24h Change: ${change.toFixed(2)}%
        </div>
        <div class="volatility">Volatility: ${volatilityLevel}</div>
        <div class="market-cap">Market Cap: ${currency === "usd" ? "$" : "₹"}${(coin.market_cap / 1e9).toFixed(2)}B</div>
        ${portfolioAmount > 0 ? `<div class="holdings">Holdings: ${portfolioAmount} = ${currency === "usd" ? "$" : "₹"}${portfolioValue.toFixed(2)}</div>` : ""}
        <div class="card-actions">
          <input type="number" placeholder="Amount" class="amount-input" id="amount-${coin.id}" min="0" step="0.01">
          <button onclick="addToPortfolio('${coin.id}')">Add to Portfolio</button>
          <button onclick="setAlert('${coin.id}')">Set Alert</button>
        </div>
      `;

      coinsDiv.appendChild(card);
    });

  container.appendChild(coinsDiv);
}

function toggleFavorite(coinId) {
  const index = favorites.indexOf(coinId);
  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push(coinId);
  }
  localStorage.setItem("favorites", JSON.stringify(favorites));
  displayCoins(latestData);
}

function addToPortfolio(coinId) {
  const amount = parseFloat(document.getElementById(`amount-${coinId}`).value);
  if (amount > 0) {
    portfolio[coinId] = (portfolio[coinId] || 0) + amount;
    localStorage.setItem("portfolio", JSON.stringify(portfolio));
    alert(`✅ Added ${amount} ${coinId} to portfolio`);
    displayCoins(latestData);
  }
}

function setAlert(coinId) {
  const price = prompt(`Set price alert for ${coinId} (current price: ${latestData.find(c => c.id === coinId).current_price})`);
  const type = prompt("Alert type: 'above' or 'below'?");
  
  if (price && (type === "above" || type === "below")) {
    priceAlerts[coinId] = priceAlerts[coinId] || [];
    priceAlerts[coinId].push({ price: parseFloat(price), type });
    localStorage.setItem("priceAlerts", JSON.stringify(priceAlerts));
    alert(`🔔 Alert set for ${coinId}`);
  }
}

// Auto refresh every 10 seconds
setInterval(fetchCrypto, 10000);

fetchCrypto();
