/**
 * @class WorkoutGenerator
 * Organiza a lógica do gerador de ficha de treino, FAQ e galeria.
 */
class WorkoutGenerator {
    // Constantes para valores fixos (melhora a manutenção)
    static SWAP_ANIMATION_DURATION = 300;

    constructor() {
        this.dom = {}; // Objeto para armazenar todos os elementos do DOM
        this.initDomElements();

        // Dados e estado
        this.exerciseData = null;
        this.lastImc = 0;
        this.currentPlan = {}; // Armazena o plano de treino atual
        this.weeklySplit = {
            "Segunda": { groups: ["costas", "biceps"], name: "Costas & Bíceps ✈️" },
            "Terça": { groups: ["peito", "triceps", "ombros"], name: "Peito, Tríceps & Ombros 💪" },
            "Quarta": { groups: ["pernas"], name: "Pernas 🦵" },
            "Quinta": { groups: ["costas", "biceps"], name: "Costas & Bíceps ✈️" },
            "Sexta": { groups: ["peito", "triceps", "ombros"], name: "Peito, Tríceps & Ombros 💪" }
        };
    }

    /**
     * Centraliza a busca por elementos do DOM para melhor organização.
     */
    initDomElements() {
        this.dom.heightInput = document.getElementById('height');
        this.dom.weightInput = document.getElementById('weight');
        this.dom.imcResultEl = document.getElementById('imc-result');
        this.dom.levelButtons = document.querySelectorAll('.level-btn');
        this.dom.limitationsCheckboxes = document.querySelectorAll('.limitations input[type="checkbox"]');
        this.dom.loaderEl = document.getElementById('loader');
        this.dom.actionButtonsContainer = document.getElementById('action-buttons');
        this.dom.printBtn = document.getElementById('print-btn');
        this.dom.pdfBtn = document.getElementById('pdf-btn');
        this.dom.workoutPlanContainer = document.getElementById('workout-plan-container');
        this.dom.workoutTabsContainer = document.getElementById('workout-tabs');
        this.dom.workoutContentContainer = document.getElementById('workout-content');
        this.dom.imageModal = document.getElementById('image-modal');
        this.dom.modalImgContent = document.getElementById('modal-img-content');
        this.dom.closeModalBtn = this.dom.imageModal.querySelector('.close-modal-btn');
    }

    async init() {
        await this.fetchExercises();
        this.addEventListeners();

        // Inicializa a galeria como um módulo separado
        const gallery = new InteractiveGallery();
        gallery.init();

        // Inicializa o FAQ como um módulo separado
        const faq = new FaqHandler();
        faq.init();
    }

    async fetchExercises() {
        // Usar this.dom.workoutContentContainer em vez do alias `resultContainer`
        try {
            const response = await fetch('data.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            this.exerciseData = await response.json();
        } catch (error) {
            console.error("Erro ao carregar os dados dos exercícios:", error);
            this.dom.workoutContentContainer.innerHTML = `<p class="error">Não foi possível carregar os exercícios. Tente recarregar a página.</p>`;
        }
    }

    addEventListeners() {
        this.dom.heightInput.addEventListener('input', () => this.calculateAndShowIMC());
        this.dom.weightInput.addEventListener('input', () => this.calculateAndShowIMC());
        this.dom.pdfBtn.addEventListener('click', () => this.handleDownloadPdf());
        this.dom.printBtn.addEventListener('click', () => window.print());

        this.dom.levelButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const level = e.target.dataset.level;
                this.handleGeneratePlan(level);
            });
        });

        // Adiciona um listener de evento delegado para os botões de troca
        this.dom.workoutContentContainer.addEventListener('click', (e) => {
            const swapBtn = e.target.closest('.swap-exercise-btn');
            if (swapBtn) this.handleSwapExercise(swapBtn);
        });
        
        // Listener para o checkbox de conclusão
        this.dom.workoutContentContainer.addEventListener('change', (e) => {
            if (e.target.classList.contains('exercise-done-checkbox')) {
                e.target.closest('.exercise-item').classList.toggle('completed');
            }
        });

        // Lógica para o seletor de tipo de treino na seção de agendamentos
        const trainingTypeButtons = document.querySelectorAll('.training-type-btn');
        trainingTypeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const type = button.dataset.type;

                // Atualiza botões
                trainingTypeButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Atualiza conteúdo
                document.querySelectorAll('.simulation-details').forEach(detail => {
                    detail.classList.remove('active');
                });
                document.getElementById(`simulation-${type}`).classList.add('active');
            });
        });
    }

    calculateAndShowIMC() {
        let height = parseFloat(this.dom.heightInput.value);
        const weight = parseFloat(this.dom.weightInput.value);

        if (height > 0 && weight > 0) {
            // Correção comum: se o usuário digitar altura em cm (ex: 175), converte para metros.
            if (height > 3) {
                height = height / 100;
                this.dom.heightInput.value = height.toFixed(2); // Atualiza o campo para o usuário
            }

            const imc = weight / (height * height);
            this.lastImc = imc;
            let category = '';
            let color = '';

            if (imc < 18.5) { category = 'Abaixo do peso'; color = '#3498db'; } 
            else if (imc < 24.9) { category = 'Peso normal'; color = '#2ecc71'; } 
            else if (imc < 29.9) { category = 'Sobrepeso'; color = '#f1c40f'; } 
            else { category = 'Obesidade'; color = '#e74c3c'; }

            this.dom.imcResultEl.innerHTML = `Seu IMC: <strong style="color: ${color};">${imc.toFixed(2)}</strong> (${category})`;
        } else {
            this.dom.imcResultEl.innerHTML = '';
            this.lastImc = 0;
        }
    }

    async handleGeneratePlan(level) {
        if (!this.exerciseData) return;

        this.toggleLoading(true, level);
        this.dom.workoutTabsContainer.innerHTML = '';
        this.dom.workoutContentContainer.innerHTML = '';
        this.dom.workoutPlanContainer.style.display = 'none';

        await new Promise(resolve => setTimeout(resolve, 500)); // Simula carregamento

        const limitations = Array.from(this.dom.limitationsCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        this.currentPlan = this.createDynamicWorkoutPlan(level, limitations);
        const plan = this.currentPlan;
        this.renderWorkoutPlanWithTabs(plan);

        this.toggleLoading(false);

        // Mantém o botão de nível selecionado
        this.dom.levelButtons.forEach(btn => btn.classList.remove('selected'));
        document.querySelector(`.level-btn[data-level="${level}"]`).classList.add('selected');
    }

    createDynamicWorkoutPlan(level, limitations) {
        const finalPlan = {};
        const exercisesPerGroup = { iniciante: 2, intermediario: 2, avancado: 3 };

        for (const day in this.weeklySplit) {
            const dayInfo = this.weeklySplit[day];
            finalPlan[day] = { name: dayInfo.name, exercises: [] };

            dayInfo.groups.forEach(group => {
                const exercises = this.getDynamicExercises(group, level, limitations, exercisesPerGroup[level]);
                finalPlan[day].exercises.push(...exercises);
            });

            // Adiciona cardio se o IMC for >= 25
            if (this.lastImc >= 25) {
                const cardio = this.getDynamicExercises('cardio', level, limitations, 1);
                if (cardio.length > 0) finalPlan[day].exercises.push({ ...cardio[0], isCardio: true });
            }
        }
        return finalPlan;
    }

    getDynamicExercises(group, level, limitations, count) {
        const levels = ['iniciante', 'intermediario', 'avancado'];
        const allowedLevels = levels.slice(0, levels.indexOf(level) + 1);

        const filtered = (this.exerciseData[group] || [])
            .filter(ex => {
                const isLevelOk = allowedLevels.includes(ex.level);
                const hasLimitation = limitations.some(lim => ex.tags.includes(`impacto_${lim}`));
                return isLevelOk && !hasLimitation;
            });

        // Lógica para variar séries e repetições
        const getSetsAndReps = () => {
            const setsOptions = { iniciante: [3], intermediario: [3, 4], avancado: [4, 5] };
            const repsOptions = { iniciante: "12-15", intermediario: "8-12", avancado: "6-10" };
            
            const sets = setsOptions[level][Math.floor(Math.random() * setsOptions[level].length)];
            return `${sets} séries de ${repsOptions[level]} repetições`;
        };

        return filtered.sort(() => 0.5 - Math.random()).slice(0, count).map(ex => ({
            ...ex,
            group: group, // Adiciona o grupo ao objeto do exercício
            details: ex.isCardio ? "15-20 minutos" : getSetsAndReps()
        }));
    }

    renderWorkoutPlanWithTabs(plan) {
        // Mapeamento de grupos musculares para ícones Font Awesome
        const groupIcons = {
            peito: "fa-solid fa-chess-board",
            costas: "fa-solid fa-person-walking-luggage", // Ícone criativo para "puxar"
            pernas: "fa-solid fa-person-walking",
            ombros: "fa-solid fa-volleyball",
            biceps: "fa-solid fa-dumbbell",
            triceps: "fa-solid fa-dumbbell",
            abdomen: "fa-solid fa-fire", // Ícone alternativo para "core"
            cardio: "fa-solid fa-heart-pulse"
        };

        this.dom.workoutTabsContainer.innerHTML = '';
        this.dom.workoutContentContainer.innerHTML = '';
        Object.keys(plan).forEach((day, index) => {
            // Cria o botão da aba
            const tabBtn = document.createElement('button');
            tabBtn.className = 'tab-btn';
            tabBtn.textContent = day;
            tabBtn.dataset.day = day; // Usado para conectar aba e conteúdo
            this.dom.workoutTabsContainer.appendChild(tabBtn);

            // Cria o conteúdo do dia
            const dayContent = document.createElement('div');
            dayContent.className = 'workout-day-content';
            dayContent.id = `content-${day}`;
            
            const dayData = plan[day];
            const exercisesHTML = dayData.exercises.length > 0
                ? dayData.exercises.map(ex => `
                    <li class="exercise-item" data-exercise-name="${ex.name}" data-group="${ex.group}" data-level="${ex.level}" data-tags="${ex.tags.join(',')}" >
                        <div class="exercise-header">
                            <div class="exercise-title">
                                <i class="exercise-group-icon ${groupIcons[ex.group] || 'fa-solid fa-question'}"></i>
                                <span class="exercise-name">${ex.name}</span>
                            </div>
                            ${!ex.isCardio ? `<button class="swap-exercise-btn" aria-label="Trocar exercício"><i class="fas fa-sync-alt"></i></button>` : ''}
                        </div>
                        <div class="exercise-body">
                            <div class="exercise-main-info">
                                <div class="exercise-details">${ex.details}</div>
                                <div class="exercise-difficulty">
                                    <div class="difficulty-bar ${ex.level}"></div>
                                    <span>${ex.level}</span>
                                </div>
                            </div>
                            <div class="tags-container">${ex.tags.map(tag => `<span class="tag">${tag.replace(/_/g, ' ')}</span>`).join('')}</div>
                        </div>
                        <div class="exercise-footer">
                            <label class="completion-label">
                                <input type="checkbox" class="exercise-done-checkbox" aria-label="Marcar como concluído">
                                Marcar como concluído
                            </label>
                        </div>
                    </li>`).join('')
                : `<li>Nenhum exercício adequado encontrado.</li>`;

            dayContent.innerHTML = `
                <h4>Foco do Treino: <span>${dayData.name}</span></h4>
                <ul class="exercise-list">${exercisesHTML}</ul>
            `;
            this.dom.workoutContentContainer.appendChild(dayContent);

            // Ativa a primeira aba
            if (index === 0) {
                tabBtn.classList.add('active');
                dayContent.classList.add('active');
            }
        });

        // Adiciona os listeners para as abas
        const tabs = this.dom.workoutTabsContainer.querySelectorAll('.tab-btn'); // Re-seleciona as abas criadas
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Desativa todos
                tabs.forEach(t => t.classList.remove('active'));
                this.dom.workoutContentContainer.querySelectorAll('.workout-day-content').forEach(c => c.classList.remove('active'));
                // Ativa o clicado
                tab.classList.add('active');
                document.getElementById(`content-${tab.dataset.day}`).classList.add('active');
            });
        });

        this.dom.workoutPlanContainer.style.display = 'block';
    }

    handleSwapExercise(swapBtn) {
        const exerciseItem = swapBtn.closest('.exercise-item');
        const exerciseName = exerciseItem.dataset.exerciseName;
        const group = exerciseItem.dataset.group;
        const level = exerciseItem.dataset.level;
        const tags = exerciseItem.dataset.tags.split(',');
        const day = exerciseItem.closest('.workout-day-content').id.replace('content-', '');

        // Encontra os exercícios já usados neste dia para evitar repetição
        const usedExercises = this.currentPlan[day].exercises.map(ex => ex.name);
        
        // Evita trocar por exercícios que causem limitações selecionadas
        const limitations = Array.from(this.dom.limitationsCheckboxes)
            .filter(cb => cb.checked).map(cb => `impacto_${cb.value}`);

        // Filtra para encontrar um novo exercício
        const potentialReplacements = (this.exerciseData[group] || [])
            .filter(ex => 
                !usedExercises.includes(ex.name) && // Não pode ser um exercício já em uso no dia
                !limitations.some(lim => ex.tags.includes(lim)) // Respeita as limitações
            );

        if (potentialReplacements.length > 0) {
            const newExercise = potentialReplacements[Math.floor(Math.random() * potentialReplacements.length)];

            // Atualiza o plano de treino no estado da classe
            const exerciseIndex = this.currentPlan[day].exercises.findIndex(ex => ex.name === exerciseName);
            if (exerciseIndex !== -1) {
                const oldExercise = this.currentPlan[day].exercises[exerciseIndex];
                newExercise.details = oldExercise.details; // Mantém as mesmas séries/reps
                newExercise.group = oldExercise.group; // Mantém o grupo original
                this.currentPlan[day].exercises[exerciseIndex] = newExercise;
            }

            // Animação e atualização do DOM
            exerciseItem.classList.add('swapping');
            setTimeout(() => {
                exerciseItem.dataset.exerciseName = newExercise.name;
                exerciseItem.querySelector('.exercise-name').textContent = newExercise.name;
                exerciseItem.querySelector('.tags-container').innerHTML = newExercise.tags.map(tag => `<span class="tag">${tag.replace(/_/g, ' ')}</span>`).join('');
                exerciseItem.dataset.tags = newExercise.tags.join(',');
                exerciseItem.classList.remove('swapping');
            }, 300); // Metade da duração da animação de 600ms

        } else {
            // Feedback visual de que não há mais trocas
            swapBtn.classList.add('no-swap');
            setTimeout(() => {
                swapBtn.classList.remove('no-swap');
            }, 500);
        }
    }

    toggleLoading(isLoading, level = null) {
        this.dom.loaderEl.style.display = isLoading ? 'block' : 'none';
        this.dom.actionButtonsContainer.style.display = !isLoading && this.dom.workoutContentContainer.hasChildNodes() ? 'flex' : 'none';

        this.dom.levelButtons.forEach(button => {
            button.disabled = isLoading;
            if (isLoading && button.dataset.level === level) {
                button.classList.add('active');
            } else if (!isLoading) {
                button.classList.remove('active'); // Remove o estado de carregamento
            }
        });
    }

    handleDownloadPdf() {
        if (typeof html2pdf === 'undefined') {
            alert('Biblioteca de PDF não carregada. Usando impressão padrão.');
            window.print();
            return;
        }

        const originalText = this.dom.pdfBtn.textContent;
        this.dom.pdfBtn.textContent = 'Gerando PDF...';
        this.dom.pdfBtn.disabled = true;

        // Clona o conteúdo para preparar para o PDF (tema claro, todos os dias visíveis)
        const contentToPrint = this.dom.workoutContentContainer.cloneNode(true);
        contentToPrint.classList.add('pdf-export-mode');

        // Mostra todos os dias no clone
        const days = contentToPrint.querySelectorAll('.workout-day-content');
        days.forEach(day => {
            day.style.display = 'block';
        });

        // Container temporário fora da tela
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.width = '800px'; // Largura A4 aproximada
        tempContainer.appendChild(contentToPrint);
        document.body.appendChild(tempContainer);

        const opt = {
            margin: 10,
            filename: 'Ficha_Treino_Samuel.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(contentToPrint).save()
            .then(() => {
                document.body.removeChild(tempContainer);
                this.dom.pdfBtn.textContent = originalText;
                this.dom.pdfBtn.disabled = false;
            });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // A classe da galeria precisa ser definida ou importada antes de ser usada.
    // Não se esqueça de importar o novo arquivo no seu HTML, ANTES do script.js:
    // <script src="gallery.js" defer></script> 
    // <script src="faq.js" defer></script>
    // <script src="script.js"></script>

    const app = new WorkoutGenerator();
    app.init();
});