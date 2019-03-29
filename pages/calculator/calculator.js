// pages/calculator/calculator.js

import {Decimal} from 'decimal.js';

Decimal.set({
    precision: 9, // 有效数字位数 // iOS计算器显示的有效位数是9位
    rounding: 4,  // 四舍五入的界限，默认4
    toExpNeg: -8,  // 显示科学计数法的界限
    toExpPos: 8,
});

/**
 * 尽可能保留完整有效数字信息的构造器
 */
const DecimalFull = Decimal.clone({
    precision: 1e+9,
    toExpNeg: -9e15,
    toExpPos: 9e15,
});

Page({

    /**
     * 页面的初始数据
     */
    data: {
        display: '0',
        // 清空按钮的状态标记（清空所有状态|清空当前操作数）
        clearAllFlag: true,
    },

    /**
     * - 用于运算的操作数 和 保存数字的字符串 分开处理；
     * - 输入类型的更新放在处理函数的最后；
     * - 操作数：由 1234567890. 以及 ± 组成
     * - 操作符：+-×÷=
     * - 功能键：AC、±、%
     */
    // 存储着将要实际参与运算的两个数字的字符串
    _operand1: null,
    _operand2: null,

    // 记录当前正在处理哪一个操作数
    CurOperandMark: {
        OPERAND_1: 'OPERAND_1',
        OPERAND_2: 'OPERAND_2',
    },
    _curOperand: null,

    // 当前操作数的已录入字符串
    _curInputNumStr: '',

    // 记录上一次输入类型，对运算流程的控制至关重要
    InputType: {
        NUMBER: 'NUMBER',
        OPERATOR: 'OPERATOR',
        FUNCTION: 'FUNCTION',
    },
    _lastInputType: null,
    _lastOperator: null,

    // 每次刚刚执行完运算的标志
    _calJustEnded: false,

    // 调试日志输出控制
    _debug: true,

    /**
     * calculator logic
     */
    _log: function () {
        if (this._debug) {
            console.log('_operand1: ' + String(this._operand1));
            console.log('_operand2: ' + String(this._operand2));
            console.log('_curOperand: ' + this._curOperand);
            console.log('_curInputNumStr: ' + this._curInputNumStr);
            console.log('-------');
            console.log('_lastInputType: ' + this._lastInputType);
            console.log('_lastOperator: ' + this._lastOperator);
            console.log('_calJustEnded: ' + this._calJustEnded);
            console.log('clearAllFlag: ' + this.data.clearAllFlag);
            console.log('-------------------------------------');
        }
    },

    /**
     * 添加千分位间隔的逗号
     */
    _addThousandSeparator: function (numStr) {
        const reg = /(-?)(\d*)(.*)/;

        const processed = numStr.replace(reg,
            function (match, cap0, cap1, cap2) {
                let seq = '';
                for (let i = cap1.length - 1, j = 0;
                     i >= 0; i--, j++) {
                    if (j % 3 === 0 && j !== 0) {
                        seq += ','
                    }
                    seq += cap1[i];
                }
                seq = seq.split('').reverse().join('');

                return cap0 + seq + cap2;
            });

        if (this._debug) console.log(numStr + ' ==> ' + processed);

        return processed;
    },

    _setDisplay: function (anything) {
        const display_str = this._addThousandSeparator(anything.toString());
        const display_str_size = Math.min(150 / display_str.length || 1, 20);
        // console.log(display_str_size);

        this.setData({
            display: display_str,
            display_font_size: display_str_size + 'vw',
        });
    },

    _clearAll: function () {
        this._setDisplay(0);

        this._operand1 = null;
        this._operand2 = null;
        this._curOperand = this.CurOperandMark.OPERAND_1;
        this._curInputNumStr = '';

        if (this._debug) console.clear();
    },

    /**
     * 清空当前操作数的处理比较简单，
     * 因为尚未涉及到操作数的处理，
     * 仅清空已录入的字符串和更新一下显示即可。
     */
    _clearCurrentOperand: function () {
        this._curInputNumStr = '0';
        this._setDisplay(0);
    },

    /**
     * 把当前已输入的数字解析为操作数
     * @private
     */
    _processCurOperand: function () {
        // 如果一开始就直接输入了操作符，即当前输入的字符串为空，那么就将操作数解析为0
        const curNum = new Decimal(this._curInputNumStr || 0);

        // 设置当前操作数，并根据情况切换为另一个操作数
        switch (this._curOperand) {
            case this.CurOperandMark.OPERAND_1:
                this._operand1 = curNum;
                this._curOperand = this.CurOperandMark.OPERAND_2;
                if (this._debug) console.log('Current operand changed to OPERAND_2');
                break;

            case this.CurOperandMark.OPERAND_2:
                this._operand2 = curNum;
                this._curOperand = this.CurOperandMark.OPERAND_1;
                if (this._debug) console.log('Current operand changed to OPERAND_1');
                break;
        }
    },


    /**
     * 以下是按钮事件处理绑定 ===========================<
     */

    /**
     * 处理数字输入。
     *
     * 注意，清空 _curInputNumStr 时机的判断应该仅限在本函数内，而不适合在其他地方处理。
     */
    inputNumber: function (evt) {
        this.setData({'curOp': null});

        // 如果上次输入的是操作符，则说明从本次数字输入起，应视为新的操作数
        if (this._lastInputType === this.InputType.OPERATOR) {
            this._curInputNumStr = '';
        }

        const INPUT = evt.currentTarget.dataset.value;

        /* 过滤无效输入，然后拼接 */
        switch (INPUT) {
            case '.':
                if (!this._curInputNumStr) {
                    this._curInputNumStr = '0';  // 直接输入小数点时，补充一个前导0
                } else {
                    if (this._curInputNumStr.indexOf('.') > 0) { // 不允许多余的小数点
                        if (this._debug) console.log('Multiple decimal points not permissible');
                        return false;
                    }
                }
                this._curInputNumStr += INPUT; // 拼接输入
                break;

            case '0':
                // 需允许显示和记录一个0，但不允许输入多个前导0
                if (this._curInputNumStr === '0') {
                    if (this._debug) console.log('Multiple leading zeros not permissible');
                    return false;
                }

                this._curInputNumStr += INPUT; // 拼接输入
                break;

            default:
                // 输入其他数字的话，需移除可能有的前导0。
                // 因为上面已经限制了多个前导0的输入，
                // 有的话也就只有一个0，这里就直接清空吧。
                if (this._curInputNumStr === '0') {
                    this._curInputNumStr = '';
                }

                this._curInputNumStr += INPUT; // 拼接输入
        }

        this._setDisplay(this._curInputNumStr);

        this._lastInputType = this.InputType.NUMBER;
        this._calJustEnded = false;
        this.setData({clearAllFlag: false});

        this._log();
    },

    /**
     * 计算。
     *
     * 注意：
     * - 计算是基于上一次的操作符；
     * - 每次处理数字的逻辑中，会把标记移到另一个操作数上。
     *
     * 以上都是理解处理逻辑的关键。
     */
    inputOperator: function (evt) {
        const curOperator = evt.currentTarget.dataset.operator;
        const recordOperator = (function () {
            this._lastOperator = curOperator;
            this._lastInputType = this.InputType.OPERATOR;
            this._log();
        }).bind(this);

        // 更新控制操作符按钮样式的标志
        this.setData({'curOp': curOperator});

        // 每当遇到操作符，就需要处理当前已录入的操作数字符串
        this._processCurOperand();

        /**
         * 执行运算前的过滤
         */
        if (
            // 上次输入的也是运算符
            (this._lastInputType === this.InputType.OPERATOR)
            ||
            // 任意一个操作数无效
            (this._operand1 === null || this._operand2 === null)
        ) {
            // 仅记录本次运算符，然后返回。
            recordOperator();
            return false;
        }

        /**
         * 进入运算
         */
        let result;
        const x = this._operand1; // 已经是 Decimal 的实例
        const y = this._operand2;

        if (this._debug) console.log(`Calculating ${x.toString()} ${this._lastOperator}(by) ${y.toString()}`);

        switch (this._lastOperator) {
            case 'plus':
                result = x.plus(y);
                break;
            case 'multiply':
                result = x.mul(y);
                break;
            case 'minus':
                result = this._curOperand === this.CurOperandMark.OPERAND_1 ?
                    x.minus(y) :
                    y.minus(x);
                break;
            case 'divide':
                result = this._curOperand === this.CurOperandMark.OPERAND_1 ?
                    x.div(y) :
                    y.div(x);
                break;
            case 'equals':
                // 因为这里做的是上一个操作符的运算，等号运算直接把上一个操作数作为计算结果即可。
                result = (this._curOperand === this.CurOperandMark.OPERAND_1) ?
                    this._operand2 : this._operand1; // 注意上次运算完后，当前操作数已被切换。
                break;
        }

        // 显示结果
        this._setDisplay(result);

        // 1.把计算结果作为下一次运算的操作数；
        // 2.另外不应把操作数的字符串值马上清空，因为之后可能会使用针对当前计算结果使用功能键。
        this._curInputNumStr = result.toString();
        this._processCurOperand();
        this.setData({clearAllFlag: false});

        // 更新状态
        this._calJustEnded = true;
        recordOperator();
    },

    /**
     * 几个功能键（AC清除键、正负号、百分号）
     */
    inputFunc: function (evt) {
        this.setData({'curOp': null});

        const func = evt.currentTarget.dataset.func;

        if (func === 'ac') {
            if (this.data.clearAllFlag) {
                this._clearAll();
                // this.setData({clearAllFlag: false});
            } else {
                this._clearCurrentOperand();
                // 就是清空当前操作数后，之后才会出现 all clear 的处理
                this.setData({clearAllFlag: true});
            }
        } else {
            if (
                this._curInputNumStr &&
                (
                    // 忽略操作符（等号=除外）之后的 正负号± 或 百分号%
                    // todo 此时可直接在 UI 上禁用按钮
                    this._lastInputType !== this.InputType.OPERATOR
                    || this._lastOperator === 'equals'
                )
            ) {
                // 仅更新字符串和显示即可，不用处理操作数
                let num;
                if (func === 'opposite') num = new Decimal(this._curInputNumStr).mul(-1);
                if (func === 'percent') num = new Decimal(this._curInputNumStr).div(100);

                this._curInputNumStr = num.toString();
                this._setDisplay(this._curInputNumStr);
            } else {
                return false; // 直接忽略，连本次的输入类型也不更新
            }
        }

        this._calJustEnded = false;

        this._log();
    },

    /**
     * 删除最右侧的数字
     */
    tap2shift: function () {
        // 原则上不允许对计算结果作删除操作
        if (this._calJustEnded) {
            return false;
        }

        if (this._curInputNumStr) {
            // 虽然不允许对计算结果做删除操作，但是因为可对计算结果执行功能键，
            // 又因为计算结果可能用了科学计数法表示，所以不能直接简单地删除最右一个字符，
            // 所以需要重新构造一个完整的 Decimal 实例，删完数字再构造一遍，再设回 display。
            let sliced = new DecimalFull(this._curInputNumStr).toString().slice(0, -1);
            this._curInputNumStr = sliced === '-' ? '' : sliced; // 删剩一个负号就也去掉
            this._setDisplay(new Decimal(this._curInputNumStr || 0).toString());
        }

        this._log();
    },

    copy: function () {
        wx.setClipboardData({
            //准备复制的数据
            data: this.data.display,
            success: function (res) {
                wx.showToast({
                    title: '已复制',
                    duration: 1000,
                });
            }
        });
    },

    paste: function () {
        wx.getClipboardData({
            success: function (res) {
                // 使用内置函数解析疑似数字的字符串，比起使用正则判断更加安全
                // 先去除可能存在的千分位逗号
                let num = parseFloat(res.data.replace(/,/g, ''));
                if (!isNaN(num)) {
                    this._curInputNumStr = String(num);
                    this._lastInputType = this.InputType.NUMBER;
                    this._setDisplay(this._curInputNumStr);
                    this._log();
                } else {
                    wx.showToast({
                        icon: 'none',
                        title: '无效数字',
                    });
                }
            }.bind(this)
        });
    },

    /**
     * 功能测试（模拟输入对比结果）
     */
    _test: function () {
        this._debug = false;

        const num = function (number) {
                String(number)
                    .split('')
                    .forEach(function (value) {
                        this.inputNumber({currentTarget: {dataset: {value: value}}})
                    }.bind(this));
            }.bind(this),
            plus = function () {
                this.inputOperator({currentTarget: {dataset: {operator: 'plus'}}})
            }.bind(this),
            multiply = function () {
                this.inputOperator({currentTarget: {dataset: {operator: 'multiply'}}})
            }.bind(this),
            minus = function () {
                this.inputOperator({currentTarget: {dataset: {operator: 'minus'}}})
            }.bind(this),
            divide = function () {
                this.inputOperator({currentTarget: {dataset: {operator: 'divide'}}})
            }.bind(this),
            equals = function () {
                this.inputOperator({currentTarget: {dataset: {operator: 'equals'}}})
            }.bind(this),
            ac = function () {
                this.inputFunc({currentTarget: {dataset: {func: 'ac'}}})
            }.bind(this),
            opposite = function () {
                this.inputFunc({currentTarget: {dataset: {func: 'opposite'}}})
            }.bind(this),
            percent = function () {
                this.inputFunc({currentTarget: {dataset: {func: 'percent'}}})
            }.bind(this),
            assert = function (formula, expectation) {
                if (!expectation) return;

                const result = this.data.display.toString();
                if (expectation.toString() === result) {
                    console.info('"' + formula + '" passed');
                } else {
                    console.warn('"' + formula + '" failed,' +
                        ' expected ' + expectation + ' but results in ' + result)
                }
            }.bind(this);


        (function () {
            console.group('基本功能');

            this._clearAll();
            num(1);
            plus();
            num(2);
            equals();
            assert('1+2=', '3');

            this._clearAll();
            num(3);
            minus();
            num(5);
            equals();
            assert('3-5=', '-2');

            this._clearAll();
            num(1);
            plus();
            num(2);
            plus();
            num(3);
            minus();
            num(7);
            equals();
            assert('1+2+3-7=', '-1');

            this._clearAll();
            num(4);
            multiply();
            num(9);
            equals();
            assert('4×9=', '36');

            this._clearAll();
            minus();
            num(6);
            equals();
            assert('-6=', '-6');

            this._clearAll();
            multiply();
            num(9);
            equals();
            assert('×9=', '0');

            this._clearAll();
            num(1);
            plus();
            num(2);
            multiply();
            num(3);
            plus();
            assert('1+2×3+', '9');

            this._clearAll();
            num(1);
            plus();
            num(2);
            equals();
            num(4);
            plus();
            num(5);
            equals();
            assert('1+2=4+5=', '9');

            console.groupEnd();
        }).bind(this)();

        (function () {
            console.group('等号的处理');

            this._clearAll();
            num(3);
            equals();
            assert('3=', '3');

            this._clearAll();
            num(1);
            plus();
            num(2);
            plus();
            num(5);
            equals();
            equals();
            equals();
            plus();
            num(3);
            equals();
            assert('1+2+5===+3=', '11');

            this._clearAll();
            num(3);
            plus();
            equals();
            plus();
            equals();
            plus();
            num(2);
            equals();
            assert('3+=+=+2=', '5');

            console.groupEnd();
        }).bind(this)();

        (function () {
            console.group('百分号的处理');

            this._clearAll();
            num(5);
            multiply();
            num(2);
            percent();
            minus();
            assert('5×2%-', '0.1');

            this._clearAll();
            num(4);
            percent();
            plus();
            num(9);
            equals();
            assert('4%+9=', '9.04');

            this._clearAll();
            num(2);
            plus();
            num(3);
            equals();
            percent();
            plus();
            num(2);
            equals();
            assert('2+3=%+2=', '2.05');

            this._clearAll();
            num(3);
            multiply();
            percent();
            multiply();
            num('40');
            equals();
            assert('3×%×40=', '120');

            this._clearAll();
            num(5);
            percent();
            plus();
            percent();
            plus();
            num(1);
            equals();
            assert('5%+%+1=', '1.05');

            this._clearAll();
            num(1);
            plus();
            percent();
            percent();
            minus();
            num(2);
            equals();
            assert('1+%%-2=', '-1');

            console.groupEnd();
        }).bind(this)();

        (function () {
            console.group('正负号');

            this._clearAll();
            num(5);
            minus();
            num(5);
            opposite();
            equals();
            assert('5-5±=', '10');

            this._clearAll();
            num(7);
            opposite();
            equals();
            assert('7±=', '-7');

            this._clearAll();
            num(1);
            opposite();
            minus();
            num(2);
            equals();
            assert('1±-2=', '-3');

            this._clearAll();
            num(1);
            plus();
            num(2);
            equals();
            opposite();
            plus();
            num(4);
            equals();
            assert('1+2=±+4=', '1');

            this._clearAll();
            num(4);
            plus();
            num(5);
            opposite();
            opposite();
            opposite();
            equals();
            assert('4+5±±±=', '-1');

            console.groupEnd();
        }).bind(this)();

        (function () {
            console.group('AC');

            this._clearAll();
            num(1);
            plus();
            num(2);
            ac();
            num(5);
            equals();
            assert('1+2AC5=', '6');

            this._clearAll();
            num(1);
            plus();
            ac();
            num(2);
            plus();
            num(2);
            equals();
            assert('1+AC2+2=', '5');

            this._clearAll();
            num(1);
            plus();
            num(2);
            equals();
            ac();
            plus();
            num(8);
            equals();
            assert('1+2=AC+8=', '8');

            this._clearAll();
            num(4);
            plus();
            num(5);
            equals();
            plus();
            num(1);
            ac();
            ac();
            plus();
            num(2);
            equals();
            assert('4+5=+1ACAC+2=', '2');

            console.groupEnd();
        }).bind(this)();

        (function () {
            console.group('特殊');

            this._clearAll();
            num('0.1');
            plus();
            num('0.2');
            equals();
            assert('0.1+0.2=', '0.3');

            this._clearAll();
            num('1.1.');
            multiply();
            num(2);
            plus();
            assert('1.1.×2+', '2.2');

            this._clearAll();
            num(4);
            multiply();
            num('.');
            num(2);
            equals();
            assert('4×.2=', '0.8');

            this._clearAll();
            num(1);
            divide();
            num(0);
            equals();
            assert('1÷0=', 'Infinity');

            this._clearAll();
            num('115467');
            multiply();
            num('1000');
            equals();
            assert('115467×1000=', '1.15467e+8');

            this._clearAll();
            num('555666.77');
            assert('555666.77', '555,666.77');

            this._clearAll();
            num('123456789');
            assert('123456789', '123,456,789');

            this._clearAll();
            num('2333.44');
            opposite();
            assert('2333.44±', '-2,333.44');

            this._clearAll();
            num('11');
            this.tap2shift();
            multiply();
            num('22');
            equals();
            assert('11s×22=', '22');

            this._clearAll();
            num('11');
            multiply();
            num('22');
            equals();
            this.tap2shift();
            this.tap2shift();
            assert('11×22=ss', '242');

            this._clearAll();
            num('123456');
            multiply();
            num('456789');
            equals();
            opposite();
            this.tap2shift();
            this.tap2shift();
            assert('123456×456789=±ss', '-5.63933428e+8');

            console.groupEnd();
        }).bind(this)();

        (function () {
            console.group('other');

            console.groupEnd();
        }).bind(this)();

        this._clearAll();
        this._debug = true;
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady: function () {
        this._clearAll();

        // this._test();
        // console.log(new Decimal(0).mul(new Decimal('Infinity')))
    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow: function () {
    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide: function () {

    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {

    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh: function () {

    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom: function () {

    },

    /**
     * 用户点击右上角分享
     */
    onShareAppMessage: function () {

    }
});