document.addEventListener('DOMContentLoaded', function() {
    // --- Lógica de Upload e Modal ---
    const uploadAntes = document.getElementById('upload-antes');
    const uploadDepois = document.getElementById('upload-depois');
    const previewAntes = document.getElementById('preview-antes');
    const previewDepois = document.getElementById('preview-depois');
    const submissionModal = document.getElementById('submission-modal');
    const publishBtn = document.getElementById('publish-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const galleryTrack = document.querySelector('.gallery-track');
    
    let imgAntesData = null;
    let imgDepoisData = null;

    function handleFileSelect(input, preview, isAntes) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.src = e.target.result;
                // Esconde o texto "Clique para enviar" para visualizar a foto
                const span = preview.nextElementSibling;
                if (span) span.style.display = 'none';

                if (isAntes) imgAntesData = e.target.result;
                else imgDepoisData = e.target.result;
                checkUploads();
            };
            reader.readAsDataURL(input.files[0]);
        }
    }

    if (uploadAntes) uploadAntes.addEventListener('change', function() { handleFileSelect(this, previewAntes, true); });
    if (uploadDepois) uploadDepois.addEventListener('change', function() { handleFileSelect(this, previewDepois, false); });

    function checkUploads() {
        if (imgAntesData && imgDepoisData) {
            submissionModal.style.display = 'flex';
        }
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            submissionModal.style.display = 'none';
            resetForm();
        });
    }

    if (publishBtn) {
        publishBtn.addEventListener('click', function() {
            const name = document.getElementById('submission-name').value || 'Aluno';
            const weightBefore = document.getElementById('submission-before-weight').value;
            const weightAfter = document.getElementById('submission-after-weight').value;
            
            const card = document.createElement('div');
            card.className = 'result-card';
            
            let weightInfo = '';
            if (weightBefore && weightAfter) {
                const diff = weightBefore - weightAfter;
                if (diff > 0) {
                    weightInfo = `<p>Perdeu ${diff.toFixed(1)}kg</p>`;
                } else {
                    weightInfo = `<p>Ganhou ${Math.abs(diff).toFixed(1)}kg de massa</p>`;
                }
            }

            card.innerHTML = `
                <div class="comparison-container">
                    <div class="comparison-item"><span class="comparison-label">Antes</span><img src="${imgAntesData}" alt="Antes"></div>
                    <div class="comparison-item"><span class="comparison-label">Depois</span><img src="${imgDepoisData}" alt="Depois"></div>
                </div>
                <div class="result-info"><h4>${name}</h4>${weightInfo}</div>
                <div class="card-actions">
                    <button class="delete-btn" title="Excluir"><i class="fas fa-trash"></i></button>
                </div>
            `;
            
            galleryTrack.appendChild(card);
            // Removido a duplicação no upload manual para não ficar repetido

            submissionModal.style.display = 'none';
            resetForm();
        });
    }

    function resetForm() {
        uploadAntes.value = ''; uploadDepois.value = '';
        previewAntes.src = ''; previewDepois.src = '';
        
        // Mostra o texto novamente para o próximo upload
        const spanAntes = previewAntes.nextElementSibling;
        const spanDepois = previewDepois.nextElementSibling;
        if (spanAntes) spanAntes.style.display = 'block';
        if (spanDepois) spanDepois.style.display = 'block';

        imgAntesData = null; imgDepoisData = null;
        document.getElementById('submission-name').value = '';
        document.getElementById('submission-before-weight').value = '';
        document.getElementById('submission-after-weight').value = '';
    }

    if (galleryTrack) {
        galleryTrack.addEventListener('click', function(e) {
            const deleteBtn = e.target.closest('.delete-btn');
            if (deleteBtn) {
                const card = deleteBtn.closest('.result-card');
                if (card && confirm('Tem certeza que deseja excluir este resultado?')) {
                    card.classList.add('fade-out');
                    setTimeout(() => {
                        card.remove();
                    }, 500);
                }
            }
        });
    }

    // --- Lógica do Carrossel Automático e Contínuo ---
    const galleryContainer = document.querySelector('.gallery-scroll-container');
    const galleryViewport = document.querySelector('.gallery-viewport');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');

    if (galleryTrack && galleryViewport) {
        const originalCards = galleryTrack.querySelectorAll('.result-card');
        
        // Clona os cards iniciais UMA vez para garantir que o carrossel tenha espaço para girar
        originalCards.forEach(card => {
            galleryTrack.appendChild(card.cloneNode(true));
        });

        let isScrolling = true;
        let scrollPos = 0;
        let resumeTimeout;

        function smoothScroll() {
            if (!isScrolling) return;

            // Se chegar ao fim, volta para o começo
            scrollPos += 0.5; // Velocidade ajustada
            if (scrollPos >= (galleryViewport.scrollWidth - galleryViewport.clientWidth)) {
                scrollPos = 0;
            } else {
                // Continua incrementando
            }
            
            galleryViewport.scrollLeft = scrollPos;
            requestAnimationFrame(smoothScroll);
        }

        // Sincroniza a posição caso o usuário role manualmente
        galleryViewport.addEventListener('scroll', () => {
            if (!isScrolling) {
                scrollPos = galleryViewport.scrollLeft;
            }
        });

        // Inicia o scroll
        requestAnimationFrame(smoothScroll);

        // Pausa o scroll quando o mouse está sobre a galeria
        galleryContainer.addEventListener('mouseenter', () => {
            isScrolling = false;
            // Retoma automaticamente após 1 minuto (60000ms)
            clearTimeout(resumeTimeout);
            resumeTimeout = setTimeout(() => {
                isScrolling = true;
                requestAnimationFrame(smoothScroll);
            }, 60000);
        });

        galleryContainer.addEventListener('mouseleave', () => {
            isScrolling = true;
            clearTimeout(resumeTimeout);
            requestAnimationFrame(smoothScroll); // Reinicia a animação
        });
        
        // Suporte para toque (mobile)
        galleryContainer.addEventListener('touchstart', () => {
            isScrolling = false;
            clearTimeout(resumeTimeout);
            resumeTimeout = setTimeout(() => {
                isScrolling = true;
                requestAnimationFrame(smoothScroll);
            }, 60000);
        }, {passive: true});

        // Lógica das Setas de Navegação
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                isScrolling = false;
                const card = galleryTrack.querySelector('.result-card');
                const scrollAmount = card ? card.offsetWidth + 20 : 320; // Largura do card + gap
                galleryViewport.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
                // Atualiza a posição lógica após o scroll manual
                setTimeout(() => { scrollPos = galleryViewport.scrollLeft; }, 500);
                clearTimeout(resumeTimeout);
                resumeTimeout = setTimeout(() => {
                    isScrolling = true;
                    requestAnimationFrame(smoothScroll);
                }, 10000); // Retoma após 10 segundos
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                isScrolling = false;
                const card = galleryTrack.querySelector('.result-card');
                const scrollAmount = card ? card.offsetWidth + 20 : 320;
                galleryViewport.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                setTimeout(() => { scrollPos = galleryViewport.scrollLeft; }, 500);
                clearTimeout(resumeTimeout);
                resumeTimeout = setTimeout(() => {
                    isScrolling = true;
                    requestAnimationFrame(smoothScroll);
                }, 10000);
            });
        }
    }

    // --- Botão Voltar ao Topo ---
    const backToTopBtn = document.getElementById('back-to-top');
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopBtn.classList.add('show');
            } else {
                backToTopBtn.classList.remove('show');
            }
        });

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // --- Carrossel de Motivação Automático ---
    const motivationSlides = document.querySelectorAll('.motivation-slide');
    let currentMotivationSlide = 0;

    if (motivationSlides.length > 0) {
        setInterval(() => {
            motivationSlides[currentMotivationSlide].classList.remove('active');
            currentMotivationSlide = (currentMotivationSlide + 1) % motivationSlides.length;
            motivationSlides[currentMotivationSlide].classList.add('active');
        }, 3000); // Troca a cada 3 segundos
    }
});
c:\Portifolio Site\Samuel.github.io\script.js
 c:\Portifolio Site\Samuel.github.io\script.js
@@ -163,4 +163,25 @@
             }, 60000);
         }, {passive: true});
     }
   // --- Navegação Ativa (Highlight no Scroll) ---
    const navLinks = document.querySelectorAll('.main-nav a');
    const sections = document.querySelectorAll('section');

    function highlightNav() {
        let current = '';
        sections.forEach(section => {            const sectionTop = section.offsetTop;
            // Ajuste de 150px para compensar a altura da barra fixa
            if (window.scrollY >= (sectionTop - 150)) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (current && link.getAttribute('href').includes(current)) {
                link.classList.add('active');
            }
       });
    }

    window.addEventListener('scroll', highlightNav);
    highlightNav(); // Executa ao carregar para marcar a seção inicial

    // --- Carrossel de Motivação Automático ---
    const motivationSlides = document.querySelectorAll('.motivation-slide');
    let currentMotivationSlide = 0;

    if (motivationSlides.length > 0) {
        setInterval(() => {
            motivationSlides[currentMotivationSlide].classList.remove('active');
            currentMotivationSlide = (currentMotivationSlide + 1) % motivationSlides.length;
            motivationSlides[currentMotivationSlide].classList.add('active');
        }, 5000); // Troca a cada 5 segundos
    }
 });
--- c:\Portifolio Site\Samuel.github.io\script.js
+++ c:\Portifolio Site\Samuel.github.io\script.js
@@ -163,4 +163,25 @@
             }, 60000);
         }, {passive: true});
     }

    // --- Navegação Ativa (Highlight no Scroll) ---
    const navLinks = document.querySelectorAll('.main-nav a');
    const sections = document.querySelectorAll('section');

    function highlightNav() {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            // Ajuste de 150px para compensar a altura da barra fixa
            if (window.scrollY >= (sectionTop - 150)) {
               current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {            link.classList.remove('active');
            if (current && link.getAttribute('href').includes(current)) {
                link.classList.add('active');
            }
        });
    }

    window.addEventListener('scroll', highlightNav);
    highlightNav(); // Executa ao carregar para marcar a seção inicial
 });--- c:\Portifolio Site\Samuel.github.io\script.js
 +++ c:\Portifolio Site\Samuel.github.io\script.js
 @@ -163,4 +163,25 @@
              }, 60000);
          }, {passive: true});
      }
 
     // --- Navegação Ativa (Highlight no Scroll) ---
     const navLinks = document.querySelectorAll('.main-nav a');
    const sections = document.querySelectorAll('section');

     function highlightNav() {
        let current = '';
         sections.forEach(section => {
             const sectionTop = section.offsetTop;
            // Ajuste de 150px para compensar a altura da barra fixa
             if (window.scrollY >= (sectionTop - 150)) {
                 current = section.getAttribute('id');
             }
         });
 
         navLinks.forEach(link => {
             link.classList.remove('active');
             if (current && link.getAttribute('href').includes(current)) {
                 link.classList.add('active');
             }
         });
     }
 
     window.addEventListener('scroll', highlightNav);
     highlightNav(); // Executa ao carregar para marcar a seção inicial
  });
 --- c:\Portifolio Site\Samuel.github.io\script.js
 +++ c:\Portifolio Site\Samuel.github.io\script.js
 @@ -163,4 +163,25 @@
              }, 60000);
          }, {passive: true});
      }
 
     // --- Navegação Ativa (Highlight no Scroll) ---
     const navLinks = document.querySelectorAll('.main-nav a');
     const sections = document.querySelectorAll('section');
 
     function highlightNav() {
         let current = '';
         sections.forEach(section => {
             const sectionTop = section.offsetTop;
             // Ajuste de 150px para compensar a altura da barra fixa
             if (window.scrollY >= (sectionTop - 150)) {
                 current = section.getAttribute('id');
            }
        });
 
         navLinks.forEach(link => {
             link.classList.remove('active');
            if (current && link.getAttribute('href').includes(current)) {
                 link.classList.add('active');
             }
         });
     }
 
    window.addEventListener('scroll', highlightNav);
    highlightNav(); // Executa ao carregar para marcar a seção inicial
  });
 
  --- c:\Portifolio Site\Samuel.github.io\script.js
+++ c:\Portifolio Site\Samuel.github.io\script.js
@@ -163,4 +163,25 @@
             }, 60000);
         }, {passive: true});
     }

    // --- Navegação Ativa (Highlight no Scroll) ---
    const navLinks = document.querySelectorAll('.main-nav a');
    const sections = document.querySelectorAll('section');

    function highlightNav() {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            // Ajuste de 150px para compensar a altura da barra fixa
            if (window.scrollY >= (sectionTop - 150)) {
               current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');   
      if (current && link.getAttribute('href').includes(current)) {
                link.classList.add('active');
           }
        });
    }

    window.addEventListener('scroll', highlightNav);
    highlightNav(); // Executa ao carregar para marcar a seção inicial
});
