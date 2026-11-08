/**
 * DEVIS-CALCULATOR.JS — MOTEUR UNIVERSEL DE CALCUL DEVIS & COMPOSITION INTERACTIVE
 * 100% Autonome • Zéro dépendance • Calcul en DZD & Millions de centimes
 * Conçu pour la suite autonome StacGate / ArchiSys3.0
 */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    const config = window.DEVIS_CONFIG;
    if (!config) {
      console.warn("DEVIS_CONFIG non trouvé.");
      return;
    }

    const stateKey = "devis_state_" + (config.profileId || "default");
    const optionCards = document.querySelectorAll(".option-card");
    const summaryRowsContainer = document.getElementById("summary-dynamic-rows");
    const totalDzdEl = document.getElementById("total-dzd");
    const totalCentimesEl = document.getElementById("total-centimes");
    const printBtn = document.getElementById("btn-print");
    const whatsappBtn = document.getElementById("btn-whatsapp");
    const resetBtn = document.getElementById("btn-reset");

    // Formatage Algérie Dinar (ex: 120 000 DZD)
    function formatDZD(amount) {
      return new Intl.NumberFormat("fr-DZ", {
        maximumFractionDigits: 0,
      }).format(amount) + " DZD";
    }

    // Formatage Millions de centimes (10 000 DZD = 1 Million de centimes)
    function formatCentimes(amountDZD) {
      const millions = amountDZD / 10000;
      // Formater avec 1 décimale si non entier, ex: 8,5 Millions
      const formatted = Number.isInteger(millions) ? millions.toString() : millions.toFixed(1).replace(".", ",");
      return formatted + " Million" + (millions >= 2 ? "s" : "") + " de centimes";
    }

    // Récupérer les options sélectionnées
    function getSelectedOptions() {
      const selected = [];
      optionCards.forEach((card) => {
        const input = card.querySelector('input[type="checkbox"], input[type="radio"]');
        if (input && input.checked) {
          const price = parseInt(input.getAttribute("data-price") || "0", 10);
          const name = input.getAttribute("data-name") || card.querySelector(".option-title").textContent.trim();
          const id = input.id || input.name;
          selected.push({ id, name, price, input });
        }
      });
      return selected;
    }

    // Recalcul du devis complet
    function calculate() {
      const selected = getSelectedOptions();
      let total = config.basePrice || 0;

      // Mettre à jour les classes .selected visuelles
      optionCards.forEach((card) => {
        const input = card.querySelector('input[type="checkbox"], input[type="radio"]');
        if (input && input.checked) {
          card.classList.add("selected");
        } else {
          card.classList.remove("selected");
        }
      });

      // Mettre à jour la liste dans le panneau récapitulatif
      if (summaryRowsContainer) {
        summaryRowsContainer.innerHTML = "";
        
        // Ligne de base
        const baseRow = document.createElement("div");
        baseRow.className = "summary-row";
        baseRow.innerHTML = `<span>${config.baseTitle || "Socle Applicatif Clé-en-main"}</span><span class="price">${formatDZD(config.basePrice)}</span>`;
        summaryRowsContainer.appendChild(baseRow);

        // Lignes options actives
        selected.forEach((opt) => {
          total += opt.price;
          const optRow = document.createElement("div");
          optRow.className = "summary-row item-active";
          optRow.innerHTML = `<span>+ ${opt.name}</span><span class="price">${opt.price > 0 ? "+" + formatDZD(opt.price) : "Inclus"}</span>`;
          summaryRowsContainer.appendChild(optRow);
        });
      } else {
        selected.forEach((opt) => {
          total += opt.price;
        });
      }

      // Mise à jour de l'affichage total
      if (totalDzdEl) totalDzdEl.textContent = formatDZD(total);
      if (totalCentimesEl) totalCentimesEl.textContent = formatCentimes(total);

      // Sauvegarde dans le localStorage
      saveState(selected);

      // Mettre à jour le lien WhatsApp
      updateWhatsAppLink(total, selected);
    }

    // Sauvegarde d'état
    function saveState(selected) {
      try {
        const ids = selected.map((s) => s.id);
        localStorage.setItem(stateKey, JSON.stringify(ids));
      } catch (e) {
        // Ignorer si localStorage restreint
      }
    }

    // Restauration d'état
    function restoreState() {
      try {
        const raw = localStorage.getItem(stateKey);
        if (raw) {
          const ids = JSON.parse(raw);
          optionCards.forEach((card) => {
            const input = card.querySelector('input[type="checkbox"], input[type="radio"]');
            if (input) {
              input.checked = ids.includes(input.id || input.name);
            }
          });
        }
      } catch (e) {
        // Ignorer
      }
    }

    // Générateur message WhatsApp
    function updateWhatsAppLink(total, selected) {
      if (!whatsappBtn) return;
      const title = config.pageTitle || "Proposition Devis Plateforme";
      let msg = `Bonjour ArchiSys3.0,\n\nJe viens de composer mon devis pour : *${title}*\n`;
      msg += `\n📦 *Montant Estimé :* ${formatDZD(total)} (${formatCentimes(total)})\n`;
      msg += `\n*Détail de ma configuration :*\n• ${config.baseTitle || "Socle Applicatif"} : ${formatDZD(config.basePrice)}\n`;

      selected.forEach((opt) => {
        msg += `• ${opt.name} : +${formatDZD(opt.price)}\n`;
      });

      msg += `\nPouvons-nous échanger pour valider cette configuration et lancer la mise en place ?`;

      const encoded = encodeURIComponent(msg);
      const phone = config.whatsappPhone ? config.whatsappPhone.replace(/[^0-9]/g, "") : "";
      whatsappBtn.href = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    }

    // Événements sur les cartes
    optionCards.forEach((card) => {
      const input = card.querySelector('input[type="checkbox"], input[type="radio"]');
      if (!input) return;

      // Clic sur toute la carte
      card.addEventListener("click", function (e) {
        if (e.target !== input) {
          if (input.type === "checkbox") {
            input.checked = !input.checked;
          } else if (input.type === "radio") {
            input.checked = true;
          }
          input.dispatchEvent(new Event("change"));
        }
      });

      input.addEventListener("change", function () {
        calculate();
      });
    });

    // Bouton Reset
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        optionCards.forEach((card) => {
          const input = card.querySelector('input[type="checkbox"], input[type="radio"]');
          if (input) {
            // Remettre selon defaultChecked si spécifié
            input.checked = input.defaultChecked;
          }
        });
        calculate();
      });
    }

    // Bouton Print
    if (printBtn) {
      printBtn.addEventListener("click", function () {
        window.print();
      });
    }

    // Initialisation
    restoreState();
    calculate();
  });
})();
