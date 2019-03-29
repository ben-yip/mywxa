// pages/clock/clock.js
Page({

    /**
     * 页面的初始数据
     */
    data: {
        sDeg: 0,
        mDeg: 0,
        hDeg: 0,
        sHandAnimation: {},
        mHandAnimation: {},
        hHandAnimation: {},
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
        wx.setKeepScreenOn({keepScreenOn: true});

        this.sHandAnimation = wx.createAnimation({transformOrigin: 'bottom'});
        this.mHandAnimation = wx.createAnimation({transformOrigin: 'bottom'});
        this.hHandAnimation = wx.createAnimation({transformOrigin: 'bottom'});

        let now = new Date();

        // 6 = 360° / 60
        // 30 = 360° / 12
        this.data.sDeg = now.getSeconds() * 6;
        this.data.mDeg = now.getMinutes() * 6;
        this.data.hDeg = now.getHours() % 12 * 30 + now.getMinutes() / 60 * 30; // perform granular rotation rather than obtain a integer

        this.sHandAnimation.rotate(this.data.sDeg).step({duration: 0});
        this.mHandAnimation.rotate(this.data.mDeg).step({duration: 0});
        this.hHandAnimation.rotate(this.data.hDeg).step({duration: 0});
        this._setSHand();
        this._setMHand();
        this._setHHand();

        const BASE_SPEED = 1; // 1 for normal speed.

        setInterval((function () {
            // 6 deg per second
            this.data.sDeg += 6;
            this.sHandAnimation.rotate(this.data.sDeg).step({duration: Math.max(1000, 1000 / BASE_SPEED)});
            this._setSHand();
        }).bind(this), 1000 / BASE_SPEED);

        setInterval((function () {
            this.mHandAnimation.rotate(++this.data.mDeg).step();
            this._setMHand();
        }).bind(this), 1000 * 60 / 6 / BASE_SPEED);

        setInterval((function () {
            this.hHandAnimation.rotate(++this.data.hDeg).step();
            this._setHHand();
        }).bind(this), 1000 * 60 * 12 / 6 / BASE_SPEED);

        // const ANI = {
        //     _doSAnimation: (function () {
        //         this.data.sDeg += 360;
        //         this.sHandAnimation.rotate(this.data.sDeg).step({duration: 1000 * 60 / BASE_SPEED});
        //         this._setSHand();
        //     }).bind(this),
        //
        //     _doMAnimation: (function () {
        //         this.data.mDeg += 360;
        //         this.mHandAnimation.rotate(this.data.mDeg).step({duration: 1000 * 60 * 60 / BASE_SPEED});
        //         this._setMHand();
        //     }).bind(this),
        //
        //     _doHAnimation: (function () {
        //         this.data.hDeg += 360;
        //         this.hHandAnimation.rotate(this.data.hDeg).step({duration: 1000 * 60 * 60 * 12 / BASE_SPEED});
        //         this._setHHand();
        //     }).bind(this)
        // };
        // ANI._doSAnimation();
        // ANI._doMAnimation();
        // ANI._doHAnimation();
        // setInterval(ANI._doSAnimation, 1000 * 60 / BASE_SPEED);
        // setInterval(ANI._doMAnimation, 1000 * 60 * 60 / BASE_SPEED);
        // setInterval(ANI._doHAnimation, 1000 * 60 * 60 * 12 / BASE_SPEED);
    },

    _setSHand: function () {
        this.setData({sHandAnimation: this.sHandAnimation.export(), sDeg: this.data.sDeg});
    },

    _setMHand: function () {
        this.setData({mHandAnimation: this.mHandAnimation.export(), mDeg: this.data.mDeg});
    },

    _setHHand: function () {
        this.setData({hHandAnimation: this.hHandAnimation.export(), hDeg: this.data.hDeg});
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

    },
});