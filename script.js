document.addEventListener('DOMContentLoaded', function () {
    // --- Lógica de Upload e Modal ---
    const uploadAntes = document.getElementById('upload-antes');
    const uploadDepois = document.getElementById('upload-depois');
    const previewAntes = document.getElementById('preview-antes');
    const previewDepois = document.getElementById('preview-depois');
    const submissionModal = document.getElementById('submission-modal');
    const publishBtn = document.getElementById('publish-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const galleryTrack = document.querySelector('.gallery-track');

    // --- CONFIGURAÇÃO DO FIREBASE (BANCO DE DADOS ONLINE) ---
    // IMPORTANTE: Substitua os dados abaixo pelos do seu projeto no Firebase Console
    // LEMBRETE: No console do Firebase, crie o "Firestore Database" em "Modo de Teste".
    const firebaseConfig = {
        apiKey: "AIzaSyDn1SIEsKNz2cJgH9B486PbtTV00JI4iMI",
        authDomain: "portifolio-samuel-12445.firebaseapp.com",
        projectId: "portifolio-samuel-12445",
        storageBucket: "portifolio-samuel-12445.firebasestorage.app",
        messagingSenderId: "802678299800",
        appId: "1:802678299800:web:24e20ecd7ccfcf93bfc4ed"
    };

    // Inicializa o Firebase
    let db;
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
    } else {
        console.error("Erro: Bibliotecas do Firebase não carregadas.");
    }

    // Helper para criar o elemento do card de forma padronizada
    function createCardElement(data) {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.setAttribute('data-id', data.id);

        card.innerHTML = `
            <div class="comparison-container">
                <div class="comparison-item"><span class="comparison-label">Antes</span><img src="${data.imgAntes}" alt="Antes"></div>
                <div class="comparison-item"><span class="comparison-label">Depois</span><img src="${data.imgDepois}" alt="Depois"></div>
            </div>
            <div class="result-info"><h4>${data.name}</h4>${data.weightInfo}</div>
            <div class="card-actions">
                <button class="delete-btn" title="Excluir"><i class="fas fa-trash"></i></button>
            </div>
        `;
        return card;
    }

    // --- SINCRONIZAÇÃO EM TEMPO REAL (PC <-> CELULAR) ---
    if (db) {
        // 1. Monitorar exclusão de cards estáticos (os que já vêm no site)
        // Carrega cache local para evitar que voltem ao recarregar (flash)
        const localDeleted = JSON.parse(localStorage.getItem('deleted_static_ids') || '[]');
        localDeleted.forEach(id => {
            const card = document.querySelector(`.result-card[data-id="${id}"]`);
            if (card) card.remove();
        });

        db.collection('deleted_static').onSnapshot(snapshot => {
            const currentDeleted = [];
            snapshot.docs.forEach(doc => {
                currentDeleted.push(doc.id);
                const card = document.querySelector(`.result-card[data-id="${doc.id}"]`);
                if (card) card.remove();
            });
            // Atualiza o cache local com a verdade do banco
            localStorage.setItem('deleted_static_ids', JSON.stringify(currentDeleted));
        });

        // 2. Monitorar novos cards adicionados (dinâmicos)
        db.collection('custom_cards').orderBy('timestamp').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === "added") {
                    // Verifica se o card já existe para evitar duplicidade visual
                    if (!document.querySelector(`.result-card[data-id="${change.doc.id}"]`)) {
                        const data = change.doc.data();
                        const cardData = { ...data, id: change.doc.id };
                        const card = createCardElement(cardData);
                        galleryTrack.appendChild(card);
                    }
                }
                if (change.type === "removed") {
                    const card = document.querySelector(`.result-card[data-id="${change.doc.id}"]`);
                    if (card) card.remove();
                }
            });
        });
    }

    let imgAntesData = null;
    let imgDepoisData = null;

    // Função para comprimir imagem antes de salvar (economiza muito espaço)
    function compressImage(file, maxWidth, quality, callback) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                callback(dataUrl);
            }
        }
    }

    function handleFileSelect(input, preview, isAntes) {
        if (input.files && input.files[0]) {
            compressImage(input.files[0], 600, 0.7, (dataUrl) => {
                preview.src = dataUrl;
                // Esconde o texto "Clique para enviar" para visualizar a foto
                const span = preview.nextElementSibling;
                if (span) span.style.display = 'none';

                if (isAntes) imgAntesData = dataUrl;
                else imgDepoisData = dataUrl;
                checkUploads();
            });
        }
    }

    if (uploadAntes) uploadAntes.addEventListener('change', function () { handleFileSelect(this, previewAntes, true); });
    if (uploadDepois) uploadDepois.addEventListener('change', function () { handleFileSelect(this, previewDepois, false); });

    function checkUploads() {
        if (imgAntesData && imgDepoisData) {
            submissionModal.style.display = 'flex';
        }
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', function () {
            submissionModal.style.display = 'none';
            resetForm();
        });
    }

    if (publishBtn) {
        publishBtn.addEventListener('click', function () {
            const name = document.getElementById('submission-name').value || 'Aluno';
            const type = document.getElementById('submission-type').value;
            const weightBefore = document.getElementById('submission-before-weight').value;
            const weightAfter = document.getElementById('submission-after-weight').value;

            let weightInfo = '';
            const diff = (weightBefore && weightAfter) ? (weightBefore - weightAfter) : 0;
            const absDiff = Math.abs(diff).toFixed(1);

            if (type === 'perda_peso') {
                weightInfo = `<p>Perdeu ${absDiff}kg</p>`;
            } else if (type === 'ganho_massa') {
                weightInfo = `<p>Ganhou ${absDiff}kg de massa</p>`;
            } else if (type === 'definicao') {
                weightInfo = `<p>Definição Muscular</p>`;
                if (diff !== 0) weightInfo += ` <small>(${diff > 0 ? '-' : '+'}${absDiff}kg)</small>`;
            } else {
                // Outro
                if (diff > 0) weightInfo = `<p>Menos ${absDiff}kg</p>`;
                else if (diff < 0) weightInfo = `<p>Mais ${absDiff}kg</p>`;
                else weightInfo = `<p>Transformação Incrível</p>`;
            }

            // Dados para salvar no Banco de Dados
            const cardData = {
                name: name,
                weightInfo: weightInfo,
                imgAntes: imgAntesData,
                imgDepois: imgDepoisData,
                timestamp: Date.now() // Importante para ordenar
            };

            // Enviar para o Firebase
            if (db) {
                db.collection('custom_cards').add(cardData)
                    .then(() => {
                        alert('Resultado publicado com sucesso!');
                        submissionModal.style.display = 'none';
                        resetForm();
                    })
                    .catch((error) => {
                        console.error("Erro ao salvar: ", error);
                        alert("Erro ao salvar. Verifique o console.");
                    });
            } else {
                alert("Erro de conexão com o banco de dados.");
            }
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
        document.getElementById('submission-type').value = 'perda_peso';
        document.getElementById('submission-before-weight').value = '';
        document.getElementById('submission-after-weight').value = '';
    }

    if (galleryTrack) {
        galleryTrack.addEventListener('click', function (e) {
            const deleteBtn = e.target.closest('.delete-btn');
            if (deleteBtn) {
                e.preventDefault(); // Evita comportamentos padrão
                e.stopPropagation(); // Impede que o clique afete outros elementos
                const card = deleteBtn.closest('.result-card');
                if (card && confirm('Tem certeza que deseja excluir este resultado?')) {
                    // Salvar ID no localStorage para não voltar ao recarregar
                    const cardId = card.getAttribute('data-id');
                    
                    if (cardId && db) {
                        // Feedback visual imediato (remove da tela antes mesmo do banco confirmar)
                        card.remove();

                        if (cardId.startsWith('static-')) {
                            // Se for card estático, marca como deletado no banco
                            db.collection('deleted_static').doc(cardId).set({ deleted: true });
                            
                            // Atualiza cache local imediatamente
                            const localDeleted = JSON.parse(localStorage.getItem('deleted_static_ids') || '[]');
                            if (!localDeleted.includes(cardId)) {
                                localDeleted.push(cardId);
                                localStorage.setItem('deleted_static_ids', JSON.stringify(localDeleted));
                            }
                        } else {
                            // Se for card personalizado, apaga o documento do banco
                            db.collection('custom_cards').doc(cardId).delete();
                        }
                    }
                }
            }
        });
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
    // --- Navegação Ativa (Highlight no Scroll) ---

    // --- Galeria Automática (Carrossel) ---
    const viewport = document.querySelector('.gallery-viewport');
    
    if (viewport) {
        let scrollInterval;
        const scrollDelay = 30; // Velocidade da rolagem contínua (ms)

        function startAutoScroll() {
            clearInterval(scrollInterval); // Evita múltiplos intervalos
            scrollInterval = setInterval(() => {
                // Só rola automaticamente se tiver mais de 4 cards
                const totalCards = viewport.querySelectorAll('.result-card').length;
                if (totalCards <= 4) return;

                // Rolagem contínua pixel a pixel
                if (viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 1) {
                    viewport.scrollLeft = 0;
                } else {
                    viewport.scrollLeft += 1;
                }
            }, scrollDelay);
        }

        function stopAutoScroll() {
            clearInterval(scrollInterval);
        }

        // Inicia o scroll automático
        startAutoScroll();

        // Pausa se o usuário tocar ou passar o mouse (para não brigar com o scroll manual)
        viewport.addEventListener('touchstart', stopAutoScroll);
        viewport.addEventListener('mouseenter', stopAutoScroll);
        
        // Reinicia quando o usuário soltar (opcional, mas bom para UX)
        viewport.addEventListener('touchend', () => setTimeout(startAutoScroll, 3000));
        viewport.addEventListener('mouseleave', startAutoScroll);

        // --- Botões de Navegação (Setas) ---
        const leftBtn = document.querySelector('.left-btn');
        const rightBtn = document.querySelector('.right-btn');

        if (leftBtn && rightBtn) {
            leftBtn.addEventListener('click', () => {
                viewport.scrollBy({ left: -320, behavior: 'smooth' }); // Rola um card para trás
                stopAutoScroll();
            });
            rightBtn.addEventListener('click', () => {
                viewport.scrollBy({ left: 320, behavior: 'smooth' }); // Rola um card para frente
                stopAutoScroll();
            });
        }
    }
});

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

    