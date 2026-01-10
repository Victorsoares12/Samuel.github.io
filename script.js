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

        // Configuração inicial de carregamento (Skeleton)
        this.dom.actionButtonsContainer.style.display = 'none';
        this.dom.loaderEl.style.display = 'none'; // Garante que o spinner antigo não apareça
        
        // Desabilita botões e marca o selecionado como ativo (loading state)
        this.dom.levelButtons.forEach(button => {
            button.disabled = true;
            if (button.dataset.level === level) button.classList.add('active');
            else button.classList.remove('active');
        });

        // Renderiza o Skeleton Screen
        this.renderSkeletonScreen();

        // Simula tempo de processamento (aumentado para 1.5s para visualizar o efeito)
        await new Promise(resolve => setTimeout(resolve, 1500));

        const limitations = Array.from(this.dom.limitationsCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        this.currentPlan = this.createDynamicWorkoutPlan(level, limitations);
        const plan = this.currentPlan;
        this.renderWorkoutPlanWithTabs(plan);
        
        // Salva o treino automaticamente se houver usuário logado
        this.saveCurrentWorkout(plan, level);

        // Restaura estado dos botões e mostra ações
        this.dom.levelButtons.forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('active');
            // Mantém o selecionado visualmente
            if (btn.dataset.level === level) btn.classList.add('selected');
            else btn.classList.remove('selected');
        });
        
        this.dom.actionButtonsContainer.style.display = 'flex';
    }

    renderSkeletonScreen() {
        this.dom.workoutTabsContainer.innerHTML = '';
        const days = Object.keys(this.weeklySplit);
        
        // Renderiza abas falsas (visuais)
        days.forEach((day, index) => {
            const tabBtn = document.createElement('button');
            tabBtn.className = `tab-btn ${index === 0 ? 'active' : ''}`;
            tabBtn.textContent = day;
            this.dom.workoutTabsContainer.appendChild(tabBtn);
        });

        this.dom.workoutContentContainer.innerHTML = '';
        
        // Cria estrutura do dia ativo com cards skeleton
        const skeletonDay = document.createElement('div');
        skeletonDay.className = 'workout-day-content active';
        
        let cardsHTML = '';
        // Gera 3 cards de exemplo para o efeito
        for (let i = 0; i < 3; i++) {
            cardsHTML += `
                <li class="exercise-item skeleton-card">
                    <div class="exercise-header">
                        <div class="skeleton skeleton-title"></div>
                    </div>
                    <div class="exercise-body">
                        <div class="skeleton skeleton-text"></div>
                        <div class="skeleton skeleton-text short"></div>
                        <div class="skeleton skeleton-text" style="margin-top: auto; height: 8px;"></div>
                    </div>
                </li>
            `;
        }

        skeletonDay.innerHTML = `
            <h4><div class="skeleton skeleton-header"></div></h4>
            <ul class="exercise-list">${cardsHTML}</ul>
        `;
        
        this.dom.workoutContentContainer.appendChild(skeletonDay);
        this.dom.workoutPlanContainer.style.display = 'block';
    }

    saveCurrentWorkout(plan, level) {
        // Verifica se há usuário logado na sessão (agora localStorage)
        const sessionUser = localStorage.getItem('samuel_active_session');
        if (!sessionUser) return;

        const user = JSON.parse(sessionUser);
        const workoutData = {
            id: Date.now(),
            date: new Date().toLocaleDateString('pt-BR'),
            level: level,
            plan: plan
        };

        // Recupera lista existente ou cria nova
        const userKey = `samuel_saved_workouts_${user.email}`;
        const savedWorkouts = JSON.parse(localStorage.getItem(userKey) || '[]');
        
        // Adiciona ao início e limita a 10 treinos
        savedWorkouts.unshift(workoutData);
        if (savedWorkouts.length > 10) savedWorkouts.pop();

        localStorage.setItem(userKey, JSON.stringify(savedWorkouts));
        // Opcional: Notificar o usuário visualmente
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

    // Método para carregar um treino salvo (chamado pelo AuthManager)
    loadSavedPlan(plan) {
        this.renderWorkoutPlanWithTabs(plan);
        this.dom.workoutPlanContainer.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * @class AuthManager
 * Gerencia o registro e login de usuários (simulado via localStorage),
 * cálculo de idade e controle do modal de acesso.
 */
class AuthManager {
    constructor() {
        this.dom = {};
        this.currentUser = null;
        this.ADMIN_EMAIL = 'admin@samuel.com'; // Email mestre
    }

    init() {
        this.initDomElements();
        this.addEventListeners();
        this.checkSession();
    }

    initDomElements() {
        this.dom.authModal = document.getElementById('auth-modal');
        this.dom.closeAuthBtn = document.getElementById('close-auth-btn');
        this.dom.tabBtns = document.querySelectorAll('.auth-tab-btn');
        this.dom.forms = document.querySelectorAll('.auth-form');
        
        // Formulário de Cadastro
        this.dom.regForm = document.getElementById('register-form');
        this.dom.regDob = document.getElementById('reg-dob');
        this.dom.regAge = document.getElementById('reg-age');
        this.dom.regPhoto = document.getElementById('reg-photo');
        
        // Formulário de Login
        this.dom.loginForm = document.getElementById('login-form');
        this.dom.forgotPasswordBtn = document.getElementById('forgot-password-btn');
        
        // Área Logada
        this.dom.userLoggedArea = document.getElementById('user-logged-area');
        this.dom.userMenuTrigger = document.getElementById('user-menu-trigger');
        this.dom.userMenuDropdown = document.getElementById('user-menu-dropdown');
        this.dom.userProfilePic = document.getElementById('user-profile-pic');
        this.dom.displayUsername = document.getElementById('display-username');
        this.dom.logoutBtn = document.getElementById('menu-logout'); // Botão agora está no menu
        
        // Menu Itens
        this.dom.menuMyWorkouts = document.getElementById('menu-my-workouts');
        this.dom.menuAdminPanel = document.getElementById('menu-admin-panel');
        this.dom.updatePhotoInput = document.getElementById('update-photo-input');
        this.dom.savedWorkoutsModal = document.getElementById('saved-workouts-modal');
        this.dom.closeSavedBtn = document.getElementById('close-saved-btn');
        this.dom.savedWorkoutsList = document.getElementById('saved-workouts-list');

        // Admin Panel
        this.dom.adminModal = document.getElementById('admin-modal');
        this.dom.closeAdminBtn = document.getElementById('close-admin-btn');
        this.dom.adminUsersList = document.getElementById('admin-users-list');
    }

    addEventListeners() {
        // Abrir/Fechar Modal
        this.dom.closeAuthBtn.addEventListener('click', () => this.dom.authModal.style.display = 'none');
        this.dom.authModal.addEventListener('click', (e) => {
            // Só fecha clicando fora se NÃO estiver em modo bloqueado
            if (e.target === this.dom.authModal && !this.dom.authModal.classList.contains('locked-mode')) {
                this.dom.authModal.style.display = 'none';
            }
        });

        // Toggle Menu Dropdown
        this.dom.userMenuTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = this.dom.userMenuDropdown.style.display === 'block';
            this.dom.userMenuDropdown.style.display = isVisible ? 'none' : 'block';
        });

        // Fechar dropdown ao clicar fora
        document.addEventListener('click', () => {
            this.dom.userMenuDropdown.style.display = 'none';
        });

        // Alterar Foto de Perfil
        this.dom.updatePhotoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => this.updateUserProfilePhoto(reader.result);
                reader.readAsDataURL(file);
            }
        });

        // Abrir Perfil
        this.dom.menuProfile.addEventListener('click', () => this.openProfile());
        this.dom.closeProfileBtn.addEventListener('click', () => this.dom.profileModal.style.display = 'none');

        // Abrir Modal de Treinos Salvos
        this.dom.menuMyWorkouts.addEventListener('click', () => this.openSavedWorkouts());
        this.dom.closeSavedBtn.addEventListener('click', () => this.dom.savedWorkoutsModal.style.display = 'none');

        // Abrir Painel Admin
        this.dom.menuAdminPanel.addEventListener('click', () => this.openAdminPanel());
        this.dom.closeAdminBtn.addEventListener('click', () => this.dom.adminModal.style.display = 'none');

        // Botão Esqueci Minha Senha
        if (this.dom.forgotPasswordBtn) {
            this.dom.forgotPasswordBtn.addEventListener('click', () => {
                const emailInput = document.getElementById('login-email');
                let email = emailInput.value;
                
                if (!email) {
                    email = prompt("Por favor, digite seu email para enviarmos o link de recuperação:");
                }
                
                if (email) alert(`Um link de redefinição de senha foi enviado para: ${email}\n(Verifique sua caixa de entrada ou spam)`);
            });
        }

        // Troca de Abas (Login vs Cadastro)
        this.dom.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.dom.tabBtns.forEach(b => b.classList.remove('active'));
                this.dom.forms.forEach(f => f.classList.remove('active'));
                
                btn.classList.add('active');
                document.getElementById(btn.dataset.target).classList.add('active');
            });
        });

        // Cálculo automático de idade
        this.dom.regDob.addEventListener('change', () => {
            const dob = new Date(this.dom.regDob.value);
            if (dob) {
                const diff_ms = Date.now() - dob.getTime();
                const age_dt = new Date(diff_ms); 
                const age = Math.abs(age_dt.getUTCFullYear() - 1970);
                this.dom.regAge.value = age;
            }
        });

        // Submit Cadastro
        this.dom.regForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const processRegistration = (photoBase64) => {
                const userData = {
                    name: document.getElementById('reg-name').value,
                    email: document.getElementById('reg-email').value,
                    password: document.getElementById('reg-password').value,
                    dob: this.dom.regDob.value,
                    age: this.dom.regAge.value,
                    photo: photoBase64 || null
                };
                
                // Suporte a múltiplos usuários
                const users = JSON.parse(localStorage.getItem('samuel_users_list') || '[]');
                if (users.some(u => u.email === userData.email)) {
                    alert('Este email já está cadastrado.');
                    return;
                }
                users.push(userData);
                localStorage.setItem('samuel_users_list', JSON.stringify(users));
                
                this.loginUser(userData);
                alert('Cadastro realizado com sucesso! Bem-vindo(a).');
            };

            const file = this.dom.regPhoto.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => processRegistration(reader.result);
                reader.readAsDataURL(file);
            } else {
                processRegistration(null);
            }
        });

        // Submit Login
        this.dom.loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            // Busca do "banco de dados" de múltiplos usuários
            const users = JSON.parse(localStorage.getItem('samuel_users_list') || '[]');
            const storedDbUser = users.find(u => u.email === email && u.password === password);
            
            if (storedDbUser) {
                this.loginUser(storedDbUser);
            } else {
                this.dom.loginForm.classList.add('shake');
                setTimeout(() => this.dom.loginForm.classList.remove('shake'), 500);
                
                // Limpa a senha para tentar de novo
                document.getElementById('login-password').value = '';
                // alert('Email ou senha incorretos!'); // Opcional: remover o alert para deixar só o visual
            }
        });

        // Atualizar Estatísticas (Peso/Altura)
        this.dom.updateStatsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const weight = parseFloat(this.dom.updateWeightInput.value);
            const height = parseFloat(this.dom.updateHeightInput.value);
            
            if (weight && height) {
                this.updateUserStats(weight, height);
            }
        });

        this.dom.logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('samuel_active_session'); // Remove da sessão
            location.reload();
        });
    }

    loginUser(userData) {
        localStorage.setItem('samuel_active_session', JSON.stringify(userData)); // Salva na sessão (persistente)
        this.currentUser = userData;
        this.updateUI(true);
        // Remove o bloqueio da tela
        this.dom.authModal.style.display = 'none';
        this.dom.authModal.classList.remove('locked-mode');
        document.body.classList.remove('body-locked');
    }

    checkSession() {
        const storedUser = localStorage.getItem('samuel_active_session'); // Verifica sessão
        if (storedUser) {
            this.currentUser = JSON.parse(storedUser);
            this.updateUI(true);
        } else {
            this.updateUI(false);
            // Força o bloqueio da tela se não houver sessão
            this.showLockScreen();
        }
    }

    showLockScreen() {
        this.dom.authModal.classList.add('locked-mode');
        this.dom.authModal.style.display = 'flex';
        document.body.classList.add('body-locked');
    }

    updateUI(isLoggedIn) {
        if (isLoggedIn) {
            this.dom.userLoggedArea.style.display = 'flex';
            this.dom.displayUsername.textContent = this.currentUser.name;
            
            if (this.currentUser.photo) {
                this.dom.userProfilePic.src = this.currentUser.photo;
                this.dom.userProfilePic.style.display = 'block';
            } else {
                this.dom.userProfilePic.style.display = 'none';
            }
            
            // Preenche automaticamente campos do gerador de treino se disponíveis
            const heightInput = document.getElementById('height');
            const weightInput = document.getElementById('weight');
            // Poderíamos salvar peso/altura no cadastro também para auto-preencher aqui

            // Verifica se é ADMIN
            if (this.currentUser.email === this.ADMIN_EMAIL) {
                this.dom.menuAdminPanel.style.display = 'block';
            } else {
                this.dom.menuAdminPanel.style.display = 'none';
            }
        } else {
            this.dom.userLoggedArea.style.display = 'none';
        }
    }

    updateUserProfilePhoto(photoBase64) {
        // Atualiza objeto local
        this.currentUser.photo = photoBase64;
        
        // Atualiza sessão atual
        localStorage.setItem('samuel_active_session', JSON.stringify(this.currentUser));
        
        // Atualiza "banco de dados" persistente
        const users = JSON.parse(localStorage.getItem('samuel_users_list') || '[]');
        const userIndex = users.findIndex(u => u.email === this.currentUser.email);
        
        if (userIndex !== -1) {
            users[userIndex].photo = photoBase64;
            localStorage.setItem('samuel_users_list', JSON.stringify(users));
        }

        this.updateUI(true);
        alert('Foto de perfil atualizada!');
    }

    updateUserStats(weight, height) {
        this.currentUser.weight = weight;
        this.currentUser.height = height;
        
        // Atualiza sessão
        localStorage.setItem('samuel_active_session', JSON.stringify(this.currentUser));
        
        // Atualiza DB persistente
        const users = JSON.parse(localStorage.getItem('samuel_users_list') || '[]');
        const userIndex = users.findIndex(u => u.email === this.currentUser.email);
        
        if (userIndex !== -1) {
            users[userIndex].weight = weight;
            users[userIndex].height = height;
            localStorage.setItem('samuel_users_list', JSON.stringify(users));
        }

        this.renderProfileStats();
        alert('Dados atualizados com sucesso!');
    }

    openProfile() {
        this.dom.profileModal.style.display = 'flex';
        this.dom.userMenuDropdown.style.display = 'none'; // Fecha o menu
        
        // Preenche dados básicos
        this.dom.profileName.textContent = this.currentUser.name;
        this.dom.profileEmail.textContent = this.currentUser.email;
        this.dom.profileAge.textContent = this.currentUser.age || '--';
        this.dom.profilePicModal.src = this.currentUser.photo || 'z-img/placeholder-upload.png'; // Fallback se não tiver foto
        
        // Preenche inputs se já existirem dados
        if (this.currentUser.weight) this.dom.updateWeightInput.value = this.currentUser.weight;
        if (this.currentUser.height) this.dom.updateHeightInput.value = this.currentUser.height;

        this.renderProfileStats();
    }

    renderProfileStats() {
        const weight = this.currentUser.weight;
        const height = this.currentUser.height;
        
        this.dom.statWeight.textContent = weight ? `${weight} kg` : '--';
        this.dom.statHeight.textContent = height ? `${height} m` : '--';
        
        if (weight && height) {
            const imc = (weight / (height * height)).toFixed(2);
            this.dom.statImc.textContent = imc;
        } else {
            this.dom.statImc.textContent = '--';
        }

        // Conta treinos salvos
        const userKey = `samuel_saved_workouts_${this.currentUser.email}`;
        const savedWorkouts = JSON.parse(localStorage.getItem(userKey) || '[]');
        this.dom.statWorkouts.textContent = savedWorkouts.length;
    }

    openSavedWorkouts() {
        this.dom.savedWorkoutsModal.style.display = 'flex';
        this.dom.savedWorkoutsList.innerHTML = '';
        
        const userKey = `samuel_saved_workouts_${this.currentUser.email}`;
        const savedWorkouts = JSON.parse(localStorage.getItem(userKey) || '[]');

        if (savedWorkouts.length === 0) {
            this.dom.savedWorkoutsList.innerHTML = '<p>Você ainda não tem treinos salvos.</p>';
            return;
        }

        savedWorkouts.forEach(workout => {
            const card = document.createElement('div');
            card.className = 'saved-workout-card';
            card.innerHTML = `
                <div class="saved-workout-info">
                    <h4>Treino ${workout.level.charAt(0).toUpperCase() + workout.level.slice(1)}</h4>
                    <p>Gerado em: ${workout.date}</p>
                </div>
                <button class="load-workout-btn">Carregar</button>
            `;
            
            card.querySelector('.load-workout-btn').addEventListener('click', () => {
                // Acessa a instância global do app para carregar o treino
                window.workoutApp.loadSavedPlan(workout.plan);
                this.dom.savedWorkoutsModal.style.display = 'none';
            });

            this.dom.savedWorkoutsList.appendChild(card);
        });
    }

    openAdminPanel() {
        this.dom.adminModal.style.display = 'flex';
        this.dom.userMenuDropdown.style.display = 'none';
        this.renderUserList();
    }

    renderUserList() {
        const users = JSON.parse(localStorage.getItem('samuel_users_list') || '[]');
        this.dom.adminUsersList.innerHTML = '';

        if (users.length === 0) {
            this.dom.adminUsersList.innerHTML = '<tr><td colspan="5">Nenhum usuário cadastrado.</td></tr>';
            return;
        }

        users.forEach((user, index) => {
            const tr = document.createElement('tr');
            const photoSrc = user.photo || 'z-img/placeholder-upload.png';
            
            tr.innerHTML = `
                <td><img src="${photoSrc}" class="admin-user-thumb" alt="Foto"></td>
                <td>${user.name} ${user.email === this.ADMIN_EMAIL ? '👑' : ''}</td>
                <td>${user.email}</td>
                <td>${user.age || '--'}</td>
                <td>
                    ${user.email !== this.ADMIN_EMAIL ? `<button class="delete-user-btn" data-email="${user.email}">Excluir</button>` : '<span style="color:#aaa; font-size:0.8rem;">Admin</span>'}
                </td>
            `;
            this.dom.adminUsersList.appendChild(tr);
        });

        // Adiciona eventos de exclusão
        this.dom.adminUsersList.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const emailToDelete = e.target.dataset.email;
                if (confirm(`Tem certeza que deseja excluir o usuário ${emailToDelete}?`)) {
                    const updatedUsers = users.filter(u => u.email !== emailToDelete);
                    localStorage.setItem('samuel_users_list', JSON.stringify(updatedUsers));
                    
                    // Remove também os treinos salvos desse usuário para limpar o banco
                    localStorage.removeItem(`samuel_saved_workouts_${emailToDelete}`);
                    this.renderUserList();
                }
            });
        });
    }
}

class ThemeManager {
    constructor() {
        this.themeBtn = document.getElementById('theme-toggle-btn');
        this.body = document.body;
        this.init();
    }

    init() {
        const savedTheme = localStorage.getItem('samuel_theme');
        if (savedTheme === 'light') this.body.classList.add('light-mode');

        this.themeBtn.addEventListener('click', () => {
            this.body.classList.toggle('light-mode');
            const isLight = this.body.classList.contains('light-mode');
            localStorage.setItem('samuel_theme', isLight ? 'light' : 'dark');
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
    // Expõe o app globalmente para ser acessado pelo AuthManager
    window.workoutApp = app;
    app.init();

    const auth = new AuthManager();
    auth.init();

    new ThemeManager();
});