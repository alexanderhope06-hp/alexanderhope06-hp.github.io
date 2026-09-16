/* =====================================================
   STORYNEST — AD BLOCK DETECTION
   NOTICE BANNER + MODAL
   ===================================================== */


/* =====================================================
   BOTTOM NOTICE BANNER
   ===================================================== */

.storynest-adblock-banner {
    position: fixed;

    left: 50%;
    bottom: 90px;

    width: calc(100% - 32px);
    max-width: 520px;

    padding: 16px 18px;

    display: flex;
    align-items: flex-start;
    gap: 14px;

    box-sizing: border-box;

    /*
     * Very high z-index so the notice stays above
     * StoryNest content and the sticky ad.
     */
    z-index: 2147483000;

    /*
     * Hidden state
     */
    opacity: 0;
    visibility: hidden;
    pointer-events: none;

    transform: translate(-50%, 40px);

    transition:
        opacity 0.35s ease,
        transform 0.35s ease,
        visibility 0.35s ease;

    /*
     * Appearance
     */
    background: rgba(23, 23, 31, 0.97);

    border: 1px solid rgba(155, 92, 255, 0.35);

    border-radius: 14px;

    box-shadow:
        0 12px 40px rgba(0, 0, 0, 0.45);

    color: #ffffff;

    font-family: inherit;
    font-size: 14px;
    line-height: 1.55;

    /*
     * Prevent content from escaping the rounded box.
     */
    overflow: hidden;

    /*
     * Glass effect where supported.
     */
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
}


/* ---------- VISIBLE STATE ---------- */

.storynest-adblock-banner.visible {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;

    transform: translate(-50%, 0);
}


/* =====================================================
   ICON
   ===================================================== */

.storynest-adblock-icon {
    flex: 0 0 auto;

    width: 26px;
    height: 26px;

    display: flex;
    align-items: center;
    justify-content: center;

    font-size: 22px;
    line-height: 1;

    margin-top: 1px;
}


/* =====================================================
   BANNER CONTENT
   ===================================================== */

.storynest-adblock-body {
    flex: 1 1 auto;
    min-width: 0;
}

.storynest-adblock-body strong {
    display: block;

    margin: 0 0 4px;

    color: #ffffff;

    font-size: 14px;
    font-weight: 700;

    line-height: 1.35;
}

.storynest-adblock-body p {
    margin: 0;

    color: #b8b8c4;

    font-size: 13px;
    line-height: 1.55;
}


/* =====================================================
   ALLOW ADS LINK
   ===================================================== */

.storynest-adblock-body a {
    color: #c39aff;

    font-weight: 600;

    text-decoration: underline;
    text-decoration-color: rgba(195, 154, 255, 0.4);

    text-underline-offset: 3px;

    transition:
        color 0.2s ease,
        text-decoration-color 0.2s ease;
}

.storynest-adblock-body a:hover {
    color: #e0c9ff;
    text-decoration-color: #e0c9ff;
}


/* =====================================================
   CLOSE BUTTON
   ===================================================== */

.storynest-adblock-close {
    flex: 0 0 auto;

    width: 28px;
    height: 28px;

    padding: 0;
    margin: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border: none;
    border-radius: 50%;

    background: rgba(255, 255, 255, 0.06);

    color: #aaa;

    font-size: 14px;
    line-height: 1;

    cursor: pointer;

    transition:
        background 0.2s ease,
        color 0.2s ease,
        transform 0.2s ease;
}

.storynest-adblock-close:hover {
    background: rgba(255, 255, 255, 0.14);
    color: #ffffff;
}

.storynest-adblock-close:active {
    transform: scale(0.92);
}


/* =====================================================
   MODAL BACKDROP
   ===================================================== */

.storynest-adblock-modal {
    position: fixed;

    inset: 0;

    /*
     * Must be above the banner.
     */
    z-index: 2147483001;

    box-sizing: border-box;

    display: flex;
    align-items: center;
    justify-content: center;

    padding: 20px;

    background: rgba(0, 0, 0, 0.70);

    opacity: 0;
    visibility: hidden;
    pointer-events: none;

    transition:
        opacity 0.25s ease,
        visibility 0.25s ease;

    /*
     * Prevent the page behind the modal from
     * accidentally receiving touches.
     */
    overscroll-behavior: contain;
}


/* ---------- VISIBLE MODAL ---------- */

.storynest-adblock-modal.visible {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
}


/* =====================================================
   MODAL BOX
   ===================================================== */

.storynest-adblock-modal-box {
    position: relative;

    width: 100%;
    max-width: 480px;

    max-height: min(85vh, 700px);

    box-sizing: border-box;

    overflow-y: auto;
    overflow-x: hidden;

    padding: 28px 26px 22px;

    border-radius: 16px;

    background: #17171f;

    border: 1px solid #35353f;

    box-shadow:
        0 20px 60px rgba(0, 0, 0, 0.60);

    color: #ffffff;

    font-family: inherit;

    /*
     * Makes scrolling smoother on mobile.
     */
    -webkit-overflow-scrolling: touch;

    overscroll-behavior: contain;
}


/* =====================================================
   MODAL HEADING
   ===================================================== */

.storynest-adblock-modal-box h3 {
    margin: 0 0 10px;

    color: #ffffff;

    font-size: 19px;
    font-weight: 700;

    line-height: 1.35;
}


/* =====================================================
   MODAL PARAGRAPHS
   ===================================================== */

.storynest-adblock-modal-box p {
    margin: 0 0 12px;

    color: #b8b8c4;

    font-size: 14px;
    line-height: 1.6;
}


/* =====================================================
   MODAL LIST
   ===================================================== */

.storynest-adblock-modal-box ul {
    margin: 0 0 16px;
    padding: 0;

    list-style: none;

    display: grid;
    gap: 10px;
}


/* =====================================================
   MODAL LIST ITEMS
   ===================================================== */

.storynest-adblock-modal-box li {
    box-sizing: border-box;

    padding: 12px 14px;

    color: #d0d0d8;

    background: #1c1c25;

    border: 1px solid #26262f;
    border-radius: 10px;

    font-size: 13.5px;
    line-height: 1.55;
}

.storynest-adblock-modal-box li strong {
    color: #ffffff;
}


/* =====================================================
   THANK-YOU MESSAGE
   ===================================================== */

.storynest-adblock-modal-thanks {
    margin: 0 !important;

    text-align: center;

    color: #c39aff !important;

    font-size: 13px !important;
    font-weight: 600;

    line-height: 1.5 !important;
}


/* =====================================================
   MODAL CLOSE BUTTON
   ===================================================== */

.storynest-adblock-modal-close {
    position: absolute;

    top: 12px;
    right: 12px;

    width: 30px;
    height: 30px;

    padding: 0;
    margin: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border: none;
    border-radius: 50%;

    background: rgba(255, 255, 255, 0.06);

    color: #aaa;

    font-size: 14px;
    line-height: 1;

    cursor: pointer;

    transition:
        background 0.2s ease,
        color 0.2s ease,
        transform 0.2s ease;
}

.storynest-adblock-modal-close:hover {
    background: rgba(255, 255, 255, 0.14);
    color: #ffffff;
}

.storynest-adblock-modal-close:active {
    transform: scale(0.92);
}


/* =====================================================
   MOBILE — 480px AND BELOW
   ===================================================== */

@media (max-width: 480px) {

    .storynest-adblock-banner {
        left: 50%;

        /*
         * Keep the notice above the sticky ad.
         */
        bottom: 84px;

        width: calc(100% - 20px);

        padding: 13px 13px;

        gap: 10px;

        border-radius: 12px;

        font-size: 13px;
    }


    .storynest-adblock-icon {
        width: 23px;
        height: 23px;

        font-size: 20px;
    }


    .storynest-adblock-body strong {
        font-size: 13px;
    }


    .storynest-adblock-body p {
        font-size: 12.5px;
        line-height: 1.5;
    }


    .storynest-adblock-close {
        width: 26px;
        height: 26px;

        font-size: 13px;
    }


    .storynest-adblock-modal {
        padding: 12px;
    }


    .storynest-adblock-modal-box {
        max-height: 90vh;

        padding: 24px 18px 18px;

        border-radius: 14px;
    }


    .storynest-adblock-modal-box h3 {
        padding-right: 30px;

        font-size: 17px;
    }


    .storynest-adblock-modal-box p {
        font-size: 13px;
        line-height: 1.55;
    }


    .storynest-adblock-modal-box li {
        padding: 11px 12px;

        font-size: 12.5px;
        line-height: 1.5;
    }
}


/* =====================================================
   VERY SMALL PHONES — 360px AND BELOW
   ===================================================== */

@media (max-width: 360px) {

    .storynest-adblock-banner {
        bottom: 78px;

        width: calc(100% - 14px);

        padding: 11px;

        gap: 8px;
    }


    .storynest-adblock-icon {
        width: 20px;
        height: 20px;

        font-size: 18px;
    }


    .storynest-adblock-body strong {
        font-size: 12.5px;
    }


    .storynest-adblock-body p {
        font-size: 12px;
    }


    .storynest-adblock-modal-box {
        padding: 22px 15px 16px;
    }
}


/* =====================================================
   REDUCED MOTION
   ===================================================== */

@media (prefers-reduced-motion: reduce) {

    .storynest-adblock-banner,
    .storynest-adblock-modal,
    .storynest-adblock-close,
    .storynest-adblock-modal-close {
        transition: none;
    }
}