document.addEventListener("DOMContentLoaded", function () {
    const loginSection = document.getElementById("login-section");
    const saveSection = document.getElementById("save-section");

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const loginButton = document.getElementById("login-button");

    const saveButton = document.getElementById("save-article-button");
    const saveStatus = document.getElementById("save-status");

    const errorLoginTag = document.getElementById('login-error');

    // noinspection JSUnresolvedReference
    const storage = chrome.storage.sync;
    // noinspection JSUnresolvedReference
    const tabsQuery = chrome.tabs.query;


    // Check if user is already logged in
    storage.get(["userToken"], function (result) {
        if (result.userToken) {
            // If we have a token, show the save section
            loginSection.classList.add("is-hidden");
            saveSection.classList.remove("is-hidden");
        } else {
            // Otherwise, show the login section
            loginSection.classList.remove("is-hidden");
            saveSection.classList.add("is-hidden");
        }
    });

    // Handle user clicking the "Log In" button
    loginButton.addEventListener("click", function () {
        errorLoginTag.textContent = '';
        saveStatus.textContent = '';

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            errorLoginTag.textContent = "Please enter both email and password.";
            return;
        }

        // POST /api/498b-b5a3/auth
        fetch("https://podcastlater.com/api/498b-b5a3/auth", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({email, password})
        })
            .then((res) => res.json())
            .then((data) => {
                // data should look like: { "api-key": "some_key" }
                if (data["api-key"]) {
                    // Store it
                    storage.set({userToken: data["api-key"]}, () => {
                        console.log("API key stored in sync storage");
                        // Switch the UI
                        loginSection.classList.add("is-hidden");
                        saveSection.classList.remove("is-hidden");
                    });
                } else {
                    errorLoginTag.textContent = "Login failed. Please check your credentials.";
                    // Ensure login is visible
                    loginSection.classList.remove("is-hidden");
                    saveSection.classList.add("is-hidden");
                }
            })
            .catch((error) => {
                console.error("Error during login:", error);
                errorLoginTag.textContent = "Login failed. Please check your email, " +
                    "password, and network.";
            });
    });

    // Handle user clicking the "Save This Page" button
    saveButton.addEventListener("click", function () {
        errorLoginTag.textContent = '';
        saveStatus.textContent = '';

        tabsQuery({active: true, currentWindow: true}, function (tabs) {
            const currentTab = tabs[0];
            const urlToSave = currentTab.url;

            // Retrieve the stored API key
            storage.get(["userToken"], function (result) {
                const userToken = result.userToken;
                if (!userToken) {
                    errorLoginTag.textContent = "You are not logged in. Please log in first.";
                    // Ensure login is visible
                    loginSection.classList.remove("is-hidden");
                    saveSection.classList.add("is-hidden");
                    return;
                }

                doSaveArticle(urlToSave, userToken);
            });
        })
    });

    function doSaveArticle(urlToSave, userToken) {
        fetch("https://podcastlater.com/api/498b-b5a3/save", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-key": userToken
            },
            body: JSON.stringify({url: urlToSave})
        })
            .then((res) => res.json())
            .then((data) => {
                // data may be {} if the article was already saved
                // or { article, save, workflow_item, success: true } if newly saved
                if (data.success) {
                    saveStatus.innerHTML = "Article saved successfully! It will appear on " +
                        "Podcast Later in roughly 30 seconds and on " +
                        "<a href='https://podcastlater.com/getting-started/rss' target='_blank'" +
                        ">your private podcast feed</a> " +
                        "shortly.";
                    saveStatus.className = "saved-message success";
                } else {
                    saveStatus.textContent = "Article was already saved. :)";
                    saveStatus.className = "saved-message no-action";
                }
            })
            .catch((err) => {
                console.error("Error saving article:", err);
                saveStatus.textContent = "Error saving article: " + err;
            });
    }
});

