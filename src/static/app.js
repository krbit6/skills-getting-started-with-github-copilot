document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper: show display name from an email (username part) or raw string
  function getDisplayName(participant) {
    if (!participant) return "Unknown";
    if (participant.includes("@")) {
      return participant.split("@")[0];
    }
    return participant;
  }

  // Helper: initials from display name
  function getInitials(name) {
    const parts = name.split(/[\s._-]+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Clear activity select options except the placeholder
      Array.from(activitySelect.options)
        .slice(1)
        .forEach((o) => o.remove());

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build basic info
        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        // Create participants container
        const participantsDiv = document.createElement("div");
        participantsDiv.className = "participants";

        const title = document.createElement("h5");
        title.textContent = "Participants";
        participantsDiv.appendChild(title);

        const list = document.createElement("ul");

        if (details.participants && details.participants.length > 0) {
          details.participants.forEach((p) => {
            const display = getDisplayName(p);
            const li = document.createElement("li");
            li.className = "participant";

            const avatar = document.createElement("span");
            avatar.className = "avatar";
            avatar.textContent = getInitials(display);

            const spanName = document.createElement("span");
            spanName.className = "name";
            spanName.textContent = display;

            // Remove/unregister button
            const removeBtn = document.createElement("button");
            removeBtn.className = "remove-btn";
            removeBtn.title = "Unregister";
            removeBtn.setAttribute("aria-label", `Unregister ${display}`);
            removeBtn.textContent = "✖";

            // When clicked, call unregister endpoint and update UI
            removeBtn.addEventListener("click", async () => {
              try {
                const resp = await fetch(
                  `/activities/${encodeURIComponent(name)}/unregister?email=${encodeURIComponent(p)}`,
                  { method: "POST" }
                );

                const resJson = await resp.json();

                if (resp.ok) {
                  // remove the list item from DOM
                  li.remove();

                  // update availability text
                  const avail = activityCard.querySelector(".availability");
                  if (avail) {
                    // compute new spots left and update local participants list
                    const currentParticipants = details.participants.filter((pp) => pp !== p);
                    details.participants = currentParticipants;
                    const newSpots = details.max_participants - currentParticipants.length;
                    avail.innerHTML = `<strong>Availability:</strong> ${newSpots} spots left`;
                  }

                  messageDiv.textContent = resJson.message || `Unregistered ${display}`;
                  messageDiv.className = "message success";
                  messageDiv.classList.remove("hidden");

                  // hide message after 5s
                  setTimeout(() => messageDiv.classList.add("hidden"), 5000);
                } else {
                  messageDiv.textContent = resJson.detail || "Failed to unregister";
                  messageDiv.className = "message error";
                  messageDiv.classList.remove("hidden");
                }
              } catch (err) {
                console.error("Error unregistering:", err);
                messageDiv.textContent = "Failed to unregister. Please try again.";
                messageDiv.className = "message error";
                messageDiv.classList.remove("hidden");
              }
            });

            li.appendChild(avatar);
            li.appendChild(spanName);
            li.appendChild(removeBtn);
            list.appendChild(li);
          });
        } else {
          const hint = document.createElement("div");
          hint.className = "no-participants";
          hint.textContent = "No one has signed up yet — be the first!";
          participantsDiv.appendChild(hint);
        }

        participantsDiv.appendChild(list);
        activityCard.appendChild(participantsDiv);
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities so the new participant appears without a page reload
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
