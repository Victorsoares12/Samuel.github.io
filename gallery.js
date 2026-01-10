/**
 * @class InteractiveGallery
 * Gerencia toda a lógica da galeria de resultados, incluindo o carrossel,
 * upload de imagens, e interações com os cards.
 */
class InteractiveGallery {
    static AUTO_SCROLL_SPEED = 0.5;
    static DRAG_MULTIPLIER = 2;

    constructor() {
        this.dom = {};
        this.editingCard = null;
        this.isAutoScrolling = true;
    }

    init() {
        this.initDomElements();
        if (!this.dom.galleryTrack || !this.dom.galleryContainer || !this.dom.galleryViewport) {
            console.warn("Elementos da galeria não encontrados. A galeria interativa não será iniciada.");
            return;
        }
        this.addEventListeners();
        this.initCarousel();
    }

    initDomElements() {
        this.dom.galleryContainer = document.querySelector('.gallery-scroll-container');
        this.dom.galleryViewport = document.querySelector('.gallery-viewport');
        this.dom.galleryTrack = document.querySelector('.gallery-track');
        this.dom.uploadAntesInput = document.getElementById('upload-antes');
        this.dom.uploadDepoisInput = document.getElementById('upload-depois');
        this.dom.previewAntes = document.getElementById('preview-antes');
        this.dom.previewDepois = document.getElementById('preview-depois');
        this.dom.submissionModal = document.getElementById('submission-modal');
        this.dom.publishBtn = document.getElementById('publish-btn');
        this.dom.cancelBtn = document.getElementById('cancel-btn');
        this.dom.imageModal = document.getElementById('image-modal');
        this.dom.modalImgContent = document.getElementById('modal-img-content');
        this.dom.closeModalBtn = this.dom.imageModal.querySelector('.close-modal-btn');
    }

    addEventListeners() {
        this.dom.uploadAntesInput.addEventListener('change', (e) => this.handleFileSelect(e, this.dom.previewAntes));
        this.dom.uploadDepoisInput.addEventListener('change', (e) => this.handleFileSelect(e, this.dom.previewDepois));
        this.dom.publishBtn.addEventListener('click', () => this.handlePublish());
        this.dom.cancelBtn.addEventListener('click', () => this.closeSubmissionModal());

        this.dom.galleryTrack.addEventListener('click', (e) => {
            const card = e.target.closest('.result-card');
            if (!card) return;

            if (e.target.closest('.delete-btn')) {
                this.handleDelete(card);
            } else if (e.target.closest('.edit-btn')) {
                this.handleEdit(card);
            } else if (e.target.tagName === 'IMG') {
                this.openImageModal(e.target.src);
            }
        });

        this.dom.closeModalBtn.addEventListener('click', () => this.closeImageModal());
        this.dom.imageModal.addEventListener('click', (e) => {
            if (e.target === this.dom.imageModal) {
                this.closeImageModal();
            }
        });
    }

    initCarousel() {
        this.dom.galleryTrack.innerHTML += this.dom.galleryTrack.innerHTML;

        let isDown = false;
        let startX;
        let scrollLeft;

        const stopAutoScroll = () => this.isAutoScrolling = false;
        const startAutoScroll = () => this.isAutoScrolling = true;

        this.dom.galleryViewport.addEventListener('mousedown', (e) => {
            isDown = true;
            stopAutoScroll();
            this.dom.galleryViewport.classList.add('grabbing');
            startX = e.pageX - this.dom.galleryViewport.offsetLeft;
            scrollLeft = this.dom.galleryViewport.scrollLeft;
        });

        ['mouseleave', 'mouseup'].forEach(event => {
            this.dom.galleryViewport.addEventListener(event, () => {
                isDown = false;
                this.dom.galleryViewport.classList.remove('grabbing');
            });
        });

        this.dom.galleryViewport.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - this.dom.galleryViewport.offsetLeft;
            const walk = (x - startX) * InteractiveGallery.DRAG_MULTIPLIER;
            this.dom.galleryViewport.scrollLeft = scrollLeft - walk;
        });

        this.dom.galleryViewport.addEventListener('mouseenter', stopAutoScroll);
        this.dom.galleryViewport.addEventListener('mouseleave', startAutoScroll);

        this.dom.galleryContainer.querySelector('.next-btn').addEventListener('click', () => {
            this.dom.galleryViewport.scrollBy({ left: 300, behavior: 'smooth' });
        });
        this.dom.galleryContainer.querySelector('.prev-btn').addEventListener('click', () => {
            this.dom.galleryViewport.scrollBy({ left: -300, behavior: 'smooth' });
        });

        const animateScroll = () => {
            if (this.isAutoScrolling) {
                this.dom.galleryViewport.scrollLeft += InteractiveGallery.AUTO_SCROLL_SPEED;
                if (this.dom.galleryViewport.scrollLeft >= this.dom.galleryTrack.scrollWidth / 2) {
                    this.dom.galleryViewport.scrollLeft = 0;
                }
            }
            requestAnimationFrame(animateScroll);
        };

        animateScroll();
    }

    openImageModal(src) {
        this.dom.modalImgContent.src = src;
        this.dom.imageModal.style.display = 'flex';
    }

    closeImageModal() {
        this.dom.imageModal.style.display = 'none';
        this.dom.modalImgContent.src = '';
    }

    handleFileSelect(event, previewElement) {
        const file = event.target.files[0];
        if (file) {
            previewElement.src = URL.createObjectURL(file);
            this.checkAndOpenModal();
        }
    }

    checkAndOpenModal() {
        if (this.dom.uploadAntesInput.files[0] && this.dom.uploadDepoisInput.files[0]) {
            this.dom.submissionModal.style.display = 'flex';
        }
    }

    closeSubmissionModal() {
        this.dom.submissionModal.style.display = 'none';
        document.getElementById('submission-name').value = '';
        document.getElementById('submission-before-weight').value = '';
        document.getElementById('submission-after-weight').value = '';
        this.dom.previewAntes.src = 'z-img/placeholder-upload.png';
        this.dom.previewDepois.src = 'z-img/placeholder-upload.png';
        this.dom.uploadAntesInput.value = '';
        this.dom.uploadDepoisInput.value = '';
        this.editingCard = null;
    }

    handlePublish() {
        const name = document.getElementById('submission-name').value;
        const beforeWeight = document.getElementById('submission-before-weight').value;
        const afterWeight = document.getElementById('submission-after-weight').value;

        if (!name || !beforeWeight || !afterWeight) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        const weightChange = afterWeight - beforeWeight;
        const changeText = weightChange > 0 ? `+${weightChange}kg` : `${weightChange}kg`;

        if (this.editingCard) {
            const imgs = this.editingCard.querySelectorAll('.comparison-item img');
            if (imgs.length === 2) {
                imgs[0].src = this.dom.previewAntes.src;
                imgs[1].src = this.dom.previewDepois.src;
                this.editingCard.querySelector('.result-info h4').textContent = `${name} (${changeText})`;
            }
        } else {
            const card = this.createResultCard(this.dom.previewAntes.src, this.dom.previewDepois.src, `${name} (${changeText})`);
            this.dom.galleryTrack.prepend(card);
        }

        this.closeSubmissionModal();
    }

    createResultCard(imgSrcAntes, imgSrcDepois, infoText) {
        const card = document.createElement('div');
        card.className = 'result-card user-submitted';
        card.innerHTML = `
            <div class="comparison-container">
                <div class="comparison-item">
                    <span class="comparison-label">Antes</span>
                    <img src="${imgSrcAntes}" alt="Antes">
                </div>
                <div class="comparison-item">
                    <span class="comparison-label">Depois</span>
                    <img src="${imgSrcDepois}" alt="Depois">
                </div>
            </div>
            <div class="result-info"><h4>${infoText}</h4></div>
            <div class="card-actions">
                <button class="edit-btn" aria-label="Editar"><i class="fas fa-pen"></i></button>
                <button class="delete-btn" aria-label="Excluir"><i class="fas fa-trash"></i></button>
            </div>
        `;
        return card;
    }

    handleDelete(cardElement) {
        if (confirm('Tem certeza que deseja excluir esta postagem?')) {
            cardElement.remove();
        }
    }

    handleEdit(cardElement) {
        alert('Funcionalidade de edição em desenvolvimento. Por enquanto, você pode excluir e postar novamente.');
    }
}