/**
 * @class FaqHandler
 * Gerencia a lógica da seção de Perguntas Frequentes (FAQ),
 * incluindo a busca "inteligente" por palavras-chave.
 */
class FaqHandler {
    constructor() {
        this.dom = {};
        this.isFetching = false; // Controla se uma busca já está em andamento
    }

    init() {
        this.initDomElements();
        this.addEventListeners();
    }

    initDomElements() {
        this.dom.faqInput = document.getElementById('faq-input');
        this.dom.faqSendBtn = document.getElementById('faq-send-btn');
        this.dom.faqResultsContainer = document.getElementById('faq-results');
    }

    addEventListeners() {
        this.dom.faqSendBtn.addEventListener('click', () => this.handleFaqSearch());
        this.dom.faqInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                this.handleFaqSearch();
            }
        });
    }

    async handleFaqSearch() {
        if (this.isFetching) return; // Evita múltiplas requisições

        const query = this.dom.faqInput.value.trim().toLowerCase();
        this.dom.faqResultsContainer.innerHTML = '';

        if (!query) {
            this.dom.faqResultsContainer.style.maxHeight = '0px';
            return;
        }
        
        this.isFetching = true;
        this.dom.faqSendBtn.disabled = true;
        this.dom.faqResultsContainer.innerHTML = `<div class="faq-result-item loading"><p>Pensando...</p></div>`;
        this.dom.faqResultsContainer.style.maxHeight = `${this.dom.faqResultsContainer.scrollHeight}px`;
        
        try {
            const response = await fetch('/api/ask-faq', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query }),
            });

            if (!response.ok) {
                throw new Error('A resposta da rede não foi bem-sucedida.');
            }

            const data = await response.json();
            this.renderAnswer(data.answer);

        } catch (error) {
            console.error("Erro ao buscar resposta da IA:", error);
            this.renderAnswer("Desculpe, tive um problema para me conectar com o assistente. Tente novamente em alguns instantes.");
        } finally {
            this.isFetching = false;
            this.dom.faqSendBtn.disabled = false;
        }
    }

    renderAnswer(answer) {
        const itemEl = document.createElement('div');
        itemEl.className = 'faq-result-item';
        // Usamos um título genérico e a resposta da IA
        itemEl.innerHTML = `<h4>Resposta do Assistente</h4><p>${answer}</p>`;
        this.dom.faqResultsContainer.innerHTML = ''; // Limpa o "Pensando..."
        this.dom.faqResultsContainer.appendChild(itemEl);
        this.dom.faqResultsContainer.style.maxHeight = `${this.dom.faqResultsContainer.scrollHeight}px`;
    }
}