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

    let imgAntesData = null;
    let imgDepoisData = null;

    function handleFileSelect(input, preview, isAntes) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function (e) {
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
            card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
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
        galleryTrack.addEventListener('click', function (e) {
            const deleteBtn = e.target.closest('.delete-btn');
            if (deleteBtn) {
                e.preventDefault(); // Evita comportamentos padrão
                e.stopPropagation(); // Impede que o clique afete outros elementos
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

    