'use strict';

// Collapsible Experience Items
document.addEventListener('DOMContentLoaded', function() {
  const collapseToggles = document.querySelectorAll('[data-collapse-toggle]');
  
  collapseToggles.forEach(toggle => {
    toggle.addEventListener('click', function() {
      const timelineItem = this.closest('.timeline-item.collapsible');
      timelineItem.classList.toggle('expanded');
    });
  });
});

// Carousel functionality for achievements
function changeSlide(button, direction) {
  const carousel = button.closest('.achievement-carousel');
  const slides = carousel.querySelectorAll('.carousel-slide');
  const dots = carousel.querySelectorAll('.carousel-dot');
  let currentIndex = Array.from(slides).findIndex(slide => slide.classList.contains('active'));
  
  currentIndex = (currentIndex + direction + slides.length) % slides.length;
  
  slides.forEach(slide => slide.classList.remove('active'));
  dots.forEach(dot => dot.classList.remove('active'));
  
  slides[currentIndex].classList.add('active');
  dots[currentIndex].classList.add('active');
}

function goToSlide(dot, index) {
  const carousel = dot.closest('.achievement-carousel');
  const slides = carousel.querySelectorAll('.carousel-slide');
  const dots = carousel.querySelectorAll('.carousel-dot');
  
  slides.forEach(slide => slide.classList.remove('active'));
  dots.forEach(d => d.classList.remove('active'));
  
  slides[index].classList.add('active');
  dots[index].classList.add('active');
}

// Simple loading sequence: 2s loading -> video -> disappear when done
// Only shows on first visit, expires after 10 minutes or when tab is closed
window.addEventListener('load', function() {
  const loadingOverlay = document.getElementById('loadingOverlay');
  const introVideo = document.getElementById('introVideo');
  const mainContent = document.querySelector('main');
  
  const INTRO_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
  const introTimestamp = sessionStorage.getItem('introShownAt');
  const now = Date.now();
  
  // Check if intro was already shown and hasn't expired
  const shouldSkipIntro = introTimestamp && (now - parseInt(introTimestamp)) < INTRO_EXPIRY_MS;
  
  if (shouldSkipIntro) {
    // Skip the intro - hide overlay immediately and show content
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
      loadingOverlay.style.display = 'none';
    }
    if (introVideo) {
      introVideo.remove();
    }
    if (mainContent) {
      mainContent.classList.add('fade-in');
    }
    return;
  }
  
  // Mark intro as shown with current timestamp
  sessionStorage.setItem('introShownAt', now.toString());
  
  // Skip intro function
  const skipIntroBtn = document.getElementById('skipIntroBtn');
  function skipIntro() {
    if (introVideo) {
      introVideo.pause();
      introVideo.remove();
    }
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
    }
    if (mainContent) {
      mainContent.classList.add('fade-in');
    }
  }
  
  // Add click handler for skip button
  if (skipIntroBtn) {
    skipIntroBtn.addEventListener('click', skipIntro);
  }
  
  if (introVideo) {
    // Start video after 2 seconds
    setTimeout(function() {
      introVideo.play();
    }, 2000);
    
    // Stop video 0.5 seconds before it ends
    introVideo.addEventListener('timeupdate', function() {
      if (introVideo.duration && introVideo.currentTime >= introVideo.duration - 0.5) {
        skipIntro();
      }
    });
  }
});

// element toggle function
const elementToggleFunc = function (elem) { elem.classList.toggle("active"); }



// sidebar variables
const sidebar = document.querySelector("[data-sidebar]");
const sidebarBtn = document.querySelector("[data-sidebar-btn]");

// sidebar toggle functionality for mobile
sidebarBtn.addEventListener("click", function () { elementToggleFunc(sidebar); });



// testimonials variables
const testimonialsItem = document.querySelectorAll("[data-testimonials-item]");
const modalContainer = document.querySelector("[data-modal-container]");
const modalCloseBtn = document.querySelector("[data-modal-close-btn]");
const overlay = document.querySelector("[data-overlay]");

// modal variable
const modalImg = document.querySelector("[data-modal-img]");
const modalTitle = document.querySelector("[data-modal-title]");
const modalText = document.querySelector("[data-modal-text]");

// modal toggle function
const testimonialsModalFunc = function () {
  modalContainer.classList.toggle("active");
  overlay.classList.toggle("active");
}

// add click event to all modal items
for (let i = 0; i < testimonialsItem.length; i++) {

  testimonialsItem[i].addEventListener("click", function () {

    modalImg.src = this.querySelector("[data-testimonials-avatar]").src;
    modalImg.alt = this.querySelector("[data-testimonials-avatar]").alt;
    modalTitle.innerHTML = this.querySelector("[data-testimonials-title]").innerHTML;
    modalText.innerHTML = this.querySelector("[data-testimonials-text]").innerHTML;

    testimonialsModalFunc();

  });

}

// add click event to modal close button
modalCloseBtn.addEventListener("click", testimonialsModalFunc);
overlay.addEventListener("click", testimonialsModalFunc);



// custom select variables
const select = document.querySelector("[data-select]");
const selectItems = document.querySelectorAll("[data-select-item]");
const selectValue = document.querySelector("[data-selecct-value]");
const filterBtn = document.querySelectorAll("[data-filter-btn]");

// select.addEventListener("click", function () { elementToggleFunc(this); });

// add event in all select items
for (let i = 0; i < selectItems.length; i++) {
  selectItems[i].addEventListener("click", function () {

    let selectedValue = this.innerText.toLowerCase();
    selectValue.innerText = this.innerText;
    elementToggleFunc(select);
    filterFunc(selectedValue);

  });
}

// filter variables
const filterItems = document.querySelectorAll("[data-filter-item]");

const filterFunc = function (selectedValue) {

  for (let i = 0; i < filterItems.length; i++) {

    if (selectedValue === "all") {
      filterItems[i].classList.add("active");
    } else if (selectedValue === filterItems[i].dataset.category) {
      filterItems[i].classList.add("active");
    } else {
      filterItems[i].classList.remove("active");
    }

  }

}

// add event in all filter button items for large screen
let lastClickedBtn = filterBtn[0];

for (let i = 0; i < filterBtn.length; i++) {

  filterBtn[i].addEventListener("click", function () {

    let selectedValue = this.innerText.toLowerCase();
    selectValue.innerText = this.innerText;
    filterFunc(selectedValue);

    lastClickedBtn.classList.remove("active");
    this.classList.add("active");
    lastClickedBtn = this;

  });

}



// contact form variables
const form = document.querySelector("[data-form]");
const formInputs = document.querySelectorAll("[data-form-input]");
const formBtn = document.querySelector("[data-form-btn]");

// add event to all form input field
for (let i = 0; i < formInputs.length; i++) {
  formInputs[i].addEventListener("input", function () {

    // check form validation
    if (form.checkValidity()) {
      formBtn.removeAttribute("disabled");
    } else {
      formBtn.setAttribute("disabled", "");
    }

  });
}

//change case to case studies

const cases = document.getElementById("cases");
console.log(cases);



// page navigation variables
const navigationLinks = document.querySelectorAll("[data-nav-link]");
const pages = document.querySelectorAll("[data-page]");

// Function to navigate to a specific page
function navigateToPage(pageName) {
  const targetPage = pageName.toLowerCase().trim();
  
  // Remove active from all pages and nav links first
  for (let j = 0; j < pages.length; j++) {
    pages[j].classList.remove("active");
  }
  for (let j = 0; j < navigationLinks.length; j++) {
    navigationLinks[j].classList.remove("active");
  }

  // Add active to matching page and nav link
  for (let j = 0; j < pages.length; j++) {
    const pageData = pages[j].dataset.page.toLowerCase().trim();
    
    if (targetPage === pageData) {
      pages[j].classList.add("active");
      
      // Find and activate the corresponding nav link
      for (let k = 0; k < navigationLinks.length; k++) {
        if (navigationLinks[k].innerHTML.toLowerCase().trim() === targetPage) {
          navigationLinks[k].classList.add("active");
          break;
        }
      }
      
      window.scrollTo(0, 0);
      break;
    }
  }
}

// Handle URL hash routing
function handleHashChange() {
  const hash = window.location.hash.slice(1); // Remove the '#'
  if (hash) {
    navigateToPage(hash);
  } else {
    // Default to 'about' if no hash
    navigateToPage('about');
  }
}

// Listen for hash changes (back/forward navigation)
window.addEventListener('hashchange', handleHashChange);

// On initial page load, check the hash
document.addEventListener('DOMContentLoaded', function() {
  // Small delay to ensure everything is loaded
  setTimeout(handleHashChange, 100);
});

// add event to all nav link
for (let i = 0; i < navigationLinks.length; i++) {
  navigationLinks[i].addEventListener("click", function () {
    const buttonText = this.innerHTML.toLowerCase().trim();
    
    // Update URL hash (this will trigger hashchange event)
    window.location.hash = buttonText;
  });
}