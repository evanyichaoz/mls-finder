let parsedData = null;

document.getElementById("parseBtn").addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: extractData
  }, (results) => {
    if (results && results[0] && results[0].result) {
      const resultData = results[0].result;
      if (resultData.error) {
        document.getElementById("status").innerText = resultData.error;
        document.getElementById("result").innerText = "";
        document.getElementById("copyBtn").style.display = "none";
        parsedData = null;
      } else {
        parsedData = resultData;
        document.getElementById("result").innerText = JSON.stringify(parsedData, null, 2);
        document.getElementById("copyBtn").style.display = "inline-block";
        document.getElementById("status").innerText = "✅ 解析成功";
      }
    } else {
      document.getElementById("status").innerText = "❌ 解析失败，请刷新页面或检查网站。";
    }
  });
});

document.getElementById("copyBtn").addEventListener("click", async () => {
  if (!parsedData) return;
  const text = JSON.stringify(parsedData, null, 2);

  try {
    await navigator.clipboard.writeText(text);
    document.getElementById("status").innerText = "✅ 已复制到剪贴板";
  } catch (err) {
    document.getElementById("status").innerText = "❌ 复制失败";
  }
});

// 在网页上下文中执行的函数
function extractData() {
  if (!window.location.hostname.includes('www.realmaster.com')) {
    return { error: '此网站不支持解析，请在 www.realmaster.com 的房源页面使用。' };
  }

  // Room, Bath, Parking
  const bedElement = document.querySelector('.fa-rmbed + span');
  const bathElement = document.querySelector('.fa-rmbath + span');
  const parkingElement = document.querySelector('.fa-rmcar + span');

  // Address components
  const streetAddressElement = document.querySelector('span.listing-prop-address');
  const cityProvincePostCodeElement = document.querySelector('p.listing-prop-address');

  let city = null;
  let province = null;
  let postCode = null;

  if (cityProvincePostCodeElement) {
    const addressParts = cityProvincePostCodeElement.innerText.split(',');
    if (addressParts.length >= 3) {
      city = addressParts[0].trim();
      province = addressParts[1].trim();
      postCode = addressParts[2].trim();
    }
  }

  // MLS Number and Status
  let mlsNum = null;
  let status = 1; // Default to 1 (e.g., for sale)

  const summaryRows = document.querySelectorAll('.prop-summary-row');
  summaryRows.forEach(row => {
    const labelElement = row.querySelector('.summary-label');
    const valueElement = row.querySelector('.summary-value');

    if (labelElement && valueElement) {
      const labelText = labelElement.innerText.trim().toLowerCase();
      const valueText = valueElement.innerText.trim();

      if (labelText === 'id') {
        mlsNum = valueText;
      } else if (labelText === 'status') {
        const statusText = valueText.toLowerCase();
        if (statusText === 'sold') {
          status = 2;
        } // 'sale' or other values will result in the default of 1
      }
    }
  });

  // Price
  const priceElement = document.querySelector('h3.listing-prop-price span.detail-price');
  let price = null;
  let soldPrice = null;
  if (priceElement) {
    const priceText = priceElement.innerText;
    // Remove non-numeric characters (like '$' and ',') and parse as a number
    const numericPrice = parseFloat(priceText.replace(/[^0-9.]/g, ''));
    if (!isNaN(numericPrice)) {
      if (status === 2) { // If status is 'sold'
        soldPrice = numericPrice;
      } else {
        price = numericPrice;
      }
    }
  }

  // Photo
  const photoElement = document.querySelector('#detail-photos img.detail-photo');

  // Construct the final object based on the desired format.
  // Fields not found in the HTML (id) are set to null.
  return {
    id: null,
    mlsNum: mlsNum,
    address: streetAddressElement ? streetAddressElement.innerText.trim() : null,
    city: city,
    province: province,
    postCode: postCode,
    price: price,
    soldPrice: soldPrice,
    status: status,
    photo: photoElement ? photoElement.src : null,
    parking: parkingElement ? parkingElement.innerText.trim() : null,
    washRoom: bathElement ? bathElement.innerText.trim() : null,
    bedRoom: bedElement ? bedElement.innerText.trim() : null,
  };
}