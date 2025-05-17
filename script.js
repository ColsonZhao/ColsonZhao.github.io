document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const loanAmountInput = document.getElementById('loan-amount');
    const loanTermSelect = document.getElementById('loan-term');
    const interestRateInput = document.getElementById('interest-rate');
    const equalPrincipalInterestRadio = document.getElementById('equal-principal-interest');
    const equalPrincipalRadio = document.getElementById('equal-principal');
    const calculateBtn = document.getElementById('calculate-btn');
    
    const monthlyPaymentElement = document.getElementById('monthly-payment');
    const totalPaymentElement = document.getElementById('total-payment');
    const totalInterestElement = document.getElementById('total-interest');
    const paymentScheduleTable = document.getElementById('payment-schedule').getElementsByTagName('tbody')[0];
    
    // 新增DOM元素
    const earlyRepaymentOption = document.getElementById('early-repayment-option');
    const earlyRepaymentInput = document.getElementById('early-repayment-input');
    const earlyRepaymentSection = document.getElementById('early-repayment-section');
    const currentPeriodInput = document.getElementById('current-period');
    const paidInterestElement = document.getElementById('paid-interest');
    const savedInterestElement = document.getElementById('saved-interest');
    
    const comparisonModal = document.getElementById('comparison-modal');
    const closeBtn = document.querySelector('.close-btn');
    const selectedPeriodElement = document.getElementById('selected-period');
    const originalInterestElement = document.getElementById('original-interest');
    const interestSavingElement = document.getElementById('interest-saving');
    
    // 图表相关
    const ctx = document.getElementById('interest-chart').getContext('2d');
    let interestChart;
    
    // 全局变量存储计算结果
    let globalPaymentSchedule = [];
    let cumulativeInterestData = [];
    let remainingInterestData = [];
    
    // 绑定提前还款选项变化事件
    earlyRepaymentOption.addEventListener('change', function() {
        if (this.checked) {
            earlyRepaymentInput.style.display = 'block';
            earlyRepaymentSection.style.display = 'block';
            calculateBtn.textContent = '分析提前还款';
            calculateBtn.classList.add('analyze');
        } else {
            earlyRepaymentInput.style.display = 'none';
            earlyRepaymentSection.style.display = 'none';
            calculateBtn.textContent = '计算';
            calculateBtn.classList.remove('analyze');
        }
    });
    
    // 绑定计算按钮点击事件
    calculateBtn.addEventListener('click', function() {
        calculateLoan();
        
        // 如果勾选了提前还款，则执行提前还款分析
        if (earlyRepaymentOption.checked) {
            analyzeEarlyRepayment();
        }
    });
    
    // 绑定关闭弹窗事件
    closeBtn.addEventListener('click', function() {
        comparisonModal.style.display = 'none';
    });
    
    // 点击窗口外部关闭弹窗
    window.addEventListener('click', function(event) {
        if (event.target == comparisonModal) {
            comparisonModal.style.display = 'none';
        }
    });
    
    // 贷款计算函数
    function calculateLoan() {
        // 获取输入值
        const loanAmount = parseFloat(loanAmountInput.value) * 10000; // 转换为元
        const loanTerm = parseInt(loanTermSelect.value);
        const annualInterestRate = parseFloat(interestRateInput.value) / 100;
        const monthlyInterestRate = annualInterestRate / 12;
        const totalMonths = loanTerm * 12;
        
        // 判断还款方式
        const isEqualPrincipalInterest = equalPrincipalInterestRadio.checked;
        
        let monthlyPayment, totalPayment, totalInterest;
        let paymentSchedule = [];
        
        if (isEqualPrincipalInterest) {
            // 等额本息计算
            monthlyPayment = loanAmount * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, totalMonths) / 
                            (Math.pow(1 + monthlyInterestRate, totalMonths) - 1);
            totalPayment = monthlyPayment * totalMonths;
            totalInterest = totalPayment - loanAmount;
            
            // 生成还款计划
            let remainingPrincipal = loanAmount;
            let cumulativeInterest = 0;
            
            for (let i = 1; i <= totalMonths; i++) {
                const interest = remainingPrincipal * monthlyInterestRate;
                const principal = monthlyPayment - interest;
                remainingPrincipal -= principal;
                cumulativeInterest += interest;
                
                // 计算剩余利息
                const remainingInterest = totalInterest - cumulativeInterest;
                
                paymentSchedule.push({
                    period: i,
                    payment: monthlyPayment,
                    principal: principal,
                    interest: interest,
                    remainingPrincipal: remainingPrincipal > 0 ? remainingPrincipal : 0,
                    cumulativeInterest: cumulativeInterest,
                    remainingInterest: remainingInterest
                });
            }
        } else {
            // 等额本金计算
            const monthlyPrincipal = loanAmount / totalMonths;
            totalPayment = 0;
            totalInterest = 0;
            
            // 生成还款计划
            let remainingPrincipal = loanAmount;
            let cumulativeInterest = 0;
            
            for (let i = 1; i <= totalMonths; i++) {
                const interest = remainingPrincipal * monthlyInterestRate;
                const payment = monthlyPrincipal + interest;
                remainingPrincipal -= monthlyPrincipal;
                
                totalPayment += payment;
                totalInterest += interest;
                cumulativeInterest += interest;
                
                // 计算剩余利息
                const remainingInterest = totalInterest - cumulativeInterest;
                
                paymentSchedule.push({
                    period: i,
                    payment: payment,
                    principal: monthlyPrincipal,
                    interest: interest,
                    remainingPrincipal: remainingPrincipal > 0 ? remainingPrincipal : 0,
                    cumulativeInterest: cumulativeInterest,
                    remainingInterest: remainingInterest
                });
            }
            
            // 首月月供
            monthlyPayment = paymentSchedule[0].payment;
        }
        
        // 更新结果显示
        monthlyPaymentElement.textContent = formatCurrency(monthlyPayment);
        totalPaymentElement.textContent = formatCurrency(totalPayment);
        totalInterestElement.textContent = formatCurrency(totalInterest);
        
        // 保存全局变量
        globalPaymentSchedule = paymentSchedule;
        
        // 更新还款明细表格
        updatePaymentScheduleTable(paymentSchedule);
        
        // 计算累计利息数据
        calculateCumulativeInterest(paymentSchedule);
        
        // 更新图表
        updateInterestChart();
    }
    
    // 计算累计利息数据
    function calculateCumulativeInterest(paymentSchedule) {
        cumulativeInterestData = [];
        remainingInterestData = [];
        
        let cumulativeInterest = 0;
        const totalInterest = paymentSchedule.reduce((sum, payment) => sum + payment.interest, 0);
        
        // 添加起始点
        cumulativeInterestData.push({ x: 0, y: 0 });
        remainingInterestData.push({ x: 0, y: totalInterest });
        
        paymentSchedule.forEach((payment, index) => {
            cumulativeInterest += payment.interest;
            const remainingInterest = totalInterest - cumulativeInterest;
            
            cumulativeInterestData.push({ x: payment.period, y: cumulativeInterest });
            remainingInterestData.push({ x: payment.period, y: remainingInterest });
        });
    }
    
    // 更新利息图表
    function updateInterestChart() {
        // 销毁旧图表
        if (interestChart) {
            interestChart.destroy();
        }
        
        // 创建新图表
        interestChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: '累计已还利息',
                        data: cumulativeInterestData,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: '剩余利息',
                        data: remainingInterestData,
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: '还款期数'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: '金额 (元)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '¥' + (value / 10000).toFixed(1) + '万';
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += formatCurrency(context.parsed.y);
                                return label;
                            }
                        }
                    }
                },
                onClick: function(e, elements) {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const period = cumulativeInterestData[index].x;
                        showComparisonModal(period);
                    }
                }
            }
        });
    }
    
    // 分析提前还款
    function analyzeEarlyRepayment() {
        if (globalPaymentSchedule.length === 0) return;
        
        const currentPeriod = parseInt(currentPeriodInput.value);
        if (isNaN(currentPeriod) || currentPeriod < 1 || currentPeriod > globalPaymentSchedule.length) {
            alert('请输入有效的期数！');
            return;
        }
        
        // 计算已还利息总额
        let paidInterest = 0;
        for (let i = 0; i < currentPeriod && i < globalPaymentSchedule.length; i++) {
            paidInterest += globalPaymentSchedule[i].interest;
        }
        
        // 计算剩余利息节省
        let savedInterest = 0;
        for (let i = currentPeriod; i < globalPaymentSchedule.length; i++) {
            savedInterest += globalPaymentSchedule[i].interest;
        }
        
        // 更新显示
        paidInterestElement.textContent = formatCurrency(paidInterest);
        savedInterestElement.textContent = formatCurrency(savedInterest);
        
        // 高亮表格中的当前期数行
        highlightTableRow(currentPeriod);
    }
    
    // 高亮表格行
    function highlightTableRow(period) {
        // 移除所有高亮
        const rows = paymentScheduleTable.getElementsByTagName('tr');
        for (let i = 0; i < rows.length; i++) {
            rows[i].classList.remove('highlighted');
        }
        
        // 添加高亮到指定行
        if (period > 0 && period <= rows.length) {
            rows[period - 1].classList.add('highlighted');
            
            // 滚动到高亮行
            rows[period - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    // 显示对比弹窗
    function showComparisonModal(period) {
        if (period <= 0 || period > globalPaymentSchedule.length) return;
        
        // 计算原计划利息
        const totalInterest = globalPaymentSchedule.reduce((sum, payment) => sum + payment.interest, 0);
        
        // 计算已还利息
        let paidInterest = 0;
        for (let i = 0; i < period && i < globalPaymentSchedule.length; i++) {
            paidInterest += globalPaymentSchedule[i].interest;
        }
        
        // 计算节省利息
        let savedInterest = 0;
        for (let i = period; i < globalPaymentSchedule.length; i++) {
            savedInterest += globalPaymentSchedule[i].interest;
        }
        
        // 更新弹窗内容
        selectedPeriodElement.textContent = period;
        originalInterestElement.textContent = formatCurrency(totalInterest);
        interestSavingElement.textContent = formatCurrency(savedInterest);
        
        // 显示弹窗
        comparisonModal.style.display = 'block';
        
        // 高亮表格行
        highlightTableRow(period);
        
        // 更新当前期数输入框
        currentPeriodInput.value = period;
        
        // 如果勾选了提前还款，则更新提前还款分析
        if (earlyRepaymentOption.checked) {
            // 更新提前还款分析
            paidInterestElement.textContent = formatCurrency(paidInterest);
            savedInterestElement.textContent = formatCurrency(savedInterest);
        }
    }
    
    // 更新还款明细表格
    function updatePaymentScheduleTable(paymentSchedule) {
        // 清空表格
        paymentScheduleTable.innerHTML = '';
        
        // 添加新行
        paymentSchedule.forEach(payment => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${payment.period}</td>
                <td>${formatCurrency(payment.payment)}</td>
                <td>${formatCurrency(payment.principal)}</td>
                <td>${formatCurrency(payment.interest)}</td>
                <td>${formatCurrency(payment.remainingPrincipal)}</td>
                <td>${formatCurrency(payment.cumulativeInterest)}</td>
                <td>${formatCurrency(payment.remainingInterest)}</td>
            `;
            
            // 添加点击事件
            row.addEventListener('click', function() {
                showComparisonModal(payment.period);
            });
            
            paymentScheduleTable.appendChild(row);
        });
    }
    
    // 格式化货币
    function formatCurrency(value) {
        return '¥' + value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    }
    
    // 初始计算一次
    calculateBtn.click();
});