/**
 * DEVIS-CALCULATOR.JS — MOTEUR UNIVERSEL DE CALCUL DEVIS & COMPOSITION INTERACTIVE
 * 100% Autonome • Zéro dépendance • Calcul en DZD & Millions de centimes • Support i18n FR/EN/AR
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

    // Langue active (via DevisI18n si présent, sinon 'fr')
    function getActiveLang() {
      if (window.DevisI18n && typeof window.DevisI18n.getLang === "function") {
        return window.DevisI18n.getLang();
      }
      return document.documentElement.lang || "fr";
    }

    // Formatage Algérie Dinar (ex: 120 000 DZD)
    function formatDZD(amount) {
      return (
        new Intl.NumberFormat("fr-DZ", {
          maximumFractionDigits: 0,
        }).format(amount) + " DZD"
      );
    }

    // Formatage Millions de centimes selon la langue
    function formatCentimes(amountDZD) {
      const millions = amountDZD / 10000;
      const lang = getActiveLang();
      const formatted = Number.isInteger(millions) ? millions.toString() : millions.toFixed(1).replace(".", ",");

      if (lang === "ar") {
        return formatted + " مليون سنتيم";
      } else if (lang === "en") {
        return formatted + " Million centimes";
      }
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

    // Libellé de base selon langue
    function getBaseTitle() {
      const lang = getActiveLang();
      if (config.baseTitleTr && config.baseTitleTr[lang]) {
        return config.baseTitleTr[lang];
      }
      return config.baseTitle || "Socle Applicatif Clé-en-main";
    }

    // Recalcul du devis complet
    function calculate() {
      const selected = getSelectedOptions();
      let total = config.basePrice || 0;
      const lang = getActiveLang();

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
        baseRow.innerHTML = `<span>${getBaseTitle()}</span><span class="price">${formatDZD(config.basePrice)}</span>`;
        summaryRowsContainer.appendChild(baseRow);

        // Lignes options actives
        const includedLabel = lang === "ar" ? "مشمول" : lang === "en" ? "Included" : "Inclus";
        selected.forEach((opt) => {
          total += opt.price;
          const optRow = document.createElement("div");
          optRow.className = "summary-row item-active";
          optRow.innerHTML = `<span>+ ${opt.name}</span><span class="price">${opt.price > 0 ? "+" + formatDZD(opt.price) : includedLabel}</span>`;
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

    // Générateur message WhatsApp localisé
    function updateWhatsAppLink(total, selected) {
      if (!whatsappBtn) return;
      const lang = getActiveLang();
      const title = config.pageTitle || "Proposition Devis Plateforme";
      let msg = "";

      if (lang === "ar") {
        msg = `مرحباً ArchiSys3.0،\n\nلقد قمت باختيار وتخصيص العرض الخاص بـ : *${title}*\n`;
        msg += `\n📦 *إجمالي الاستثمار التقديري :* ${formatDZD(total)} (${formatCentimes(total)})\n`;
        msg += `\n*تفاصيل الباقة المحددة :*\n• ${getBaseTitle()} : ${formatDZD(config.basePrice)}\n`;
        selected.forEach((opt) => {
          msg += `• ${opt.name} : +${formatDZD(opt.price)}\n`;
        });
        msg += `\nهل يمكننا التواصل لتأكيد هذا العرض والبدء في التنفيذ؟`;
      } else if (lang === "en") {
        msg = `Hello ArchiSys3.0,\n\nI just configured my quote for: *${title}*\n`;
        msg += `\n📦 *Estimated Total Investment:* ${formatDZD(total)} (${formatCentimes(total)})\n`;
        msg += `\n*Configuration Breakdown:*\n• ${getBaseTitle()} : ${formatDZD(config.basePrice)}\n`;
        selected.forEach((opt) => {
          msg += `• ${opt.name} : +${formatDZD(opt.price)}\n`;
        });
        msg += `\nCan we discuss to validate this configuration and launch implementation?`;
      } else {
        msg = `Bonjour ArchiSys3.0,\n\nJe viens de composer mon devis pour : *${title}*\n`;
        msg += `\n📦 *Montant Estimé :* ${formatDZD(total)} (${formatCentimes(total)})\n`;
        msg += `\n*Détail de ma configuration :*\n• ${getBaseTitle()} : ${formatDZD(config.basePrice)}\n`;
        selected.forEach((opt) => {
          msg += `• ${opt.name} : +${formatDZD(opt.price)}\n`;
        });
        msg += `\nPouvons-nous échanger pour valider cette configuration et lancer la mise en place ?`;
      }

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

    // Écouter le changement de langue depuis devis-i18n.js
    window.addEventListener("devis:langChanged", function () {
      calculate();
    });

    // Initialisation
    restoreState();
    calculate();
  });
})();
