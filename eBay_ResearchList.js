// ==UserScript==
// @name         eBay Research & Item タイトル・画像URL・アイテムIDコピーボタン
// @namespace    https://example.com/
// @version      1.2
// @description  eBay ResearchページとItem個別ページの商品タイトル、画像URL、アイテムIDをコピーできるボタンを追加
// @match        *://*.ebay.com/sh/research*
// @match        *://*.ebay.com/itm/*
// @run-at       document-idle
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
    'use strict';

    // ページURLに基づいて適切な処理を実行
    const currentUrl = window.location.href;

    if (currentUrl.includes('/sh/research')) {
        // リサーチページ用の処理
        initResearchPage();
    } else if (currentUrl.includes('/itm/')) {
        // 商品個別ページ用の処理
        initItemPage();
    }

    // リサーチページ用の初期化
    function initResearchPage() {
        // ページ初期ロード時にボタンを追加
        window.addEventListener('load', function() {
            setTimeout(addCopyButtonsToResearch, 1000);
        });

        // DOM変更を監視
        const observer = new MutationObserver(function(mutations) {
            let needsUpdate = false;
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length > 0 || mutation.type === 'attributes') {
                    needsUpdate = true;
                }
            });
            if (needsUpdate) {
                setTimeout(addCopyButtonsToResearch, 500);
            }
        });

        // 監視設定
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
    }

    // 商品個別ページ用の初期化
    function initItemPage() {
        // ページ初期ロード時にボタンを追加
        window.addEventListener('load', function() {
            setTimeout(addCopyButtonsToItemPage, 1000);
        });

        // DOM変更を監視（商品ページの画像やタイトルが動的に読み込まれる場合に備える）
        const observer = new MutationObserver(function(mutations) {
            let needsUpdate = false;
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length > 0 || mutation.type === 'attributes') {
                    needsUpdate = true;
                }
            });
            if (needsUpdate) {
                setTimeout(addCopyButtonsToItemPage, 500);
            }
        });

        // 監視設定
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
    }

    // リサーチページに商品リストのコピーボタンを追加
    function addCopyButtonsToResearch() {
        try {
            // 商品リストの各行を取得
            const productRows = document.querySelectorAll('tr.research-table-row');

            // 各行に処理を適用
            for (var i = 0; i < productRows.length; i++) {
                var row = productRows[i];

                // すでにボタンが追加されている行はスキップ
                if (row.querySelector('.tm-copy-title-btn')) continue;

                // タイトル要素を特定（後でコピーするため）
                const titleSpan = row.querySelector('span[data-item-id]');
                if (!titleSpan) continue;

                // 画像要素を特定（URLをコピーするため）
                const imgElement = row.querySelector('.research-table-row__thumbnail img.small');
                if (!imgElement) continue;

                // サムネイル要素を特定（ボタン配置のため）
                const thumbnailDiv = row.querySelector('.research-table-row__thumbnail');
                if (!thumbnailDiv) continue;

                // サムネイル要素にポジション設定（absoluteポジショニングのため）
                if (getComputedStyle(thumbnailDiv).position === 'static') {
                    thumbnailDiv.style.position = 'relative';
                }

                // タイトルコピーボタンの作成
                var btnTitle = document.createElement('button');
                btnTitle.className = 'tm-copy-title-btn';
                btnTitle.textContent = '商品名';
                btnTitle.title = 'タイトルをコピー';

                // 画像URLコピーボタンの作成
                var btnImage = document.createElement('button');
                btnImage.className = 'tm-copy-img-btn';
                btnImage.textContent = '画像';
                btnImage.title = '画像URLをコピー';

                // タイトルコピーボタンのスタイル設定
                applyButtonStyle(btnTitle, {
                    position: 'absolute',
                    left: '-65px',
                    top: '25%',
                    background: 'rgb(3, 102, 214)' // 青色
                });

                // 画像URLコピーボタンのスタイル設定
                applyButtonStyle(btnImage, {
                    position: 'absolute',
                    left: '-65px',
                    top: '75%',
                    background: 'rgb(76, 175, 80)' // 緑色
                });

                // タイトルコピーボタンのクリックイベントを設定
                (function(span, btn) {
                    btn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        // タイトルテキストを取得してクリップボードにコピー
                        const titleText = span.textContent.trim();
                        GM_setClipboard(titleText);

                        // フィードバック表示
                        const originalBg = btn.style.backgroundColor;
                        btn.style.backgroundColor = 'rgb(44, 187, 93)';
                        btn.textContent = '商品名済';

                        // 元に戻す
                        setTimeout(function() {
                            btn.style.backgroundColor = originalBg;
                            btn.textContent = '商品名';
                        }, 1000);
                    });
                })(titleSpan, btnTitle);

                // 画像URLコピーボタンのクリックイベントを設定
                (function(img, btn) {
                    btn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        // 画像URLを取得（//から始まるURLにhttps:を追加）
                        let imgUrl = img.getAttribute('src');
                        if (imgUrl && imgUrl.startsWith('//')) {
                            imgUrl = 'https:' + imgUrl;
                        }

                        // クリップボードにコピー
                        if (imgUrl) {
                            GM_setClipboard(imgUrl);

                            // フィードバック表示
                            const originalBg = btn.style.backgroundColor;
                            btn.style.backgroundColor = 'rgb(44, 187, 93)';
                            btn.textContent = 'コピー済';

                            // 元に戻す
                            setTimeout(function() {
                                btn.style.backgroundColor = originalBg;
                                btn.textContent = '画像';
                            }, 1000);
                        }
                    });
                })(imgElement, btnImage);

                // ボタンをサムネイル要素に追加
                thumbnailDiv.appendChild(btnTitle);
                thumbnailDiv.appendChild(btnImage);
            }
        } catch (error) {
            console.error('リサーチページコピーボタン追加エラー:', error);
        }
    }

    // 商品個別ページにコピーボタンを追加
    function addCopyButtonsToItemPage() {
        try {
            // すでにボタンが追加されていればスキップ
            if (document.querySelector('.tm-item-copy-title-btn')) return;

            // タイトル要素を特定
            const titleElement = document.querySelector('.x-item-title__mainTitle span.ux-textspans');
            if (!titleElement) return;

            // アイテムIDを特定 - より具体的なセレクターを使用
            let itemId = '';
            // 特定の親子関係に基づく複合セレクターを使用
            const itemIdElement = document.querySelector('div[class*="ux-layout-section__textual-display--itemId"] .ux-textspans--BOLD');
            if (itemIdElement) {
                itemId = itemIdElement.textContent.trim();
            }

            // アマゾンリンクボタンコンテナを検索
            const amazonButtonsContainer = document.querySelector('#h1_append1');

            // ボタンコンテナを作成（Amazon ボタン群と同じ高さに配置）
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'tm-ebay-copy-buttons-container';
            buttonContainer.style.cssText = 'display: inline-flex; vertical-align: top; margin-left: 5px;';

            // ボタンを作成
            var btnTitle = document.createElement('button');
            btnTitle.className = 'tm-item-copy-title-btn';
            btnTitle.textContent = '商品名';
            btnTitle.title = 'タイトルをコピー';

            var btnImage = document.createElement('button');
            btnImage.className = 'tm-item-copy-img-btn';
            btnImage.textContent = '画像';
            btnImage.title = '画像URLをコピー';

            // アイテムIDコピーボタンの作成
            var btnItemId = document.createElement('button');
            btnItemId.className = 'tm-item-copy-id-btn';
            btnItemId.textContent = 'アイテムID';
            btnItemId.title = 'アイテムIDをコピー';

            // ボタンのスタイル設定（Amazon ボタンと同じ高さに合わせる）
            const buttonStyle = 'margin-right: 5px; padding: 5px 10px; border: none; border-radius: 4px; color: white; font-weight: bold; cursor: pointer; height: 30px; line-height: 1;';
            btnTitle.style.cssText = buttonStyle + 'background-color: rgb(3, 102, 214);'; // 青色
            btnImage.style.cssText = buttonStyle + 'background-color: rgb(76, 175, 80);';  // 緑色
            btnItemId.style.cssText = buttonStyle + 'background-color: rgb(156, 39, 176);'; // 紫色

            // ボタンをコンテナに追加
            buttonContainer.appendChild(btnTitle);
            buttonContainer.appendChild(btnImage);
            buttonContainer.appendChild(btnItemId);

            // 挿入先を決定
            let insertTarget = null;

            // Amazon ボタンがある場合はその中に挿入
            if (amazonButtonsContainer) {
                // Amazon ボタンコンテナに直接追加
                amazonButtonsContainer.appendChild(buttonContainer);
            } else {
                // タイトルの後に挿入
                const titleContainer = titleElement.closest('.x-item-title');
                if (titleContainer) {
                    // ボタンコンテナを作成
                    const customContainer = document.createElement('div');
                    customContainer.id = 'custom_button_container';
                    customContainer.style.cssText = 'width: 100%; display: flex; margin-top: 5px;';

                    // コンテナにボタンを追加
                    customContainer.appendChild(buttonContainer);

                    // タイトル直後に挿入
                    const titleHeader = titleContainer.querySelector('h1');
                    if (titleHeader) {
                        titleHeader.after(customContainer);
                    } else {
                        titleContainer.appendChild(customContainer);
                    }
                } else {
                    // ドキュメントのボディに追加（最終手段）
                    document.body.appendChild(buttonContainer);
                }
            }

            // 画像URLコピーボタンのクリックイベント
            btnImage.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                // アクティブな画像を検索
                let imgUrl = null;

                // 複数の可能性のある画像要素を順に確認
                const selectors = [
                    '.ux-image-carousel-item.active img', // カルーセル内のアクティブな画像
                    '.ux-image-grid-item.active img', // グリッド内のアクティブな画像
                    '.ux-image-carousel img[src]:not([data-src])' // ロード済みの画像
                ];

                for (let selector of selectors) {
                    const imgElement = document.querySelector(selector);
                    if (imgElement) {
                        // s-l140.webp形式の小さな画像からフルサイズのURLを取得
                        imgUrl = imgElement.getAttribute('src');
                        if (imgUrl) break;
                    }
                }

                if (imgUrl) {
                    // s-l140.webp を s-l1600.jpg に置換（フルサイズ画像を取得）
                    imgUrl = imgUrl.replace(/s-l\d+\.webp/, 's-l1600.jpg');

                    // //から始まるURLにhttps:を追加
                    if (imgUrl.startsWith('//')) {
                        imgUrl = 'https:' + imgUrl;
                    }

                    // クリップボードにコピー
                    GM_setClipboard(imgUrl);

                    // フィードバック表示
                    const originalBg = this.style.backgroundColor;
                    this.style.backgroundColor = 'rgb(44, 187, 93)';
                    this.textContent = 'コピー済';

                    // 元に戻す
                    var self = this;
                    setTimeout(function() {
                        self.style.backgroundColor = originalBg;
                        self.textContent = '画像';
                    }, 1000);
                } else {
                    alert('画像URLが見つかりませんでした。');
                }
            });

            // タイトルコピーボタンのクリックイベント
            btnTitle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                // タイトルテキストを取得してクリップボードにコピー
                const titleText = titleElement.textContent.trim();
                GM_setClipboard(titleText);

                // フィードバック表示
                const originalBg = this.style.backgroundColor;
                this.style.backgroundColor = 'rgb(44, 187, 93)';
                this.textContent = '商品名済';

                // 元に戻す
                var self = this;
                setTimeout(function() {
                    self.style.backgroundColor = originalBg;
                    self.textContent = '商品名';
                }, 1000);
            });

            // アイテムIDコピーボタンのクリックイベント
            btnItemId.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                // アイテムIDを取得
                let idToCopy = itemId;

                // もしアイテムIDがない場合は、もう一度探す
                if (!idToCopy) {
                    // より具体的なセレクターでDOM内でアイテムID要素を再検索
                    const idElement = document.querySelector('div[class*="ux-layout-section__textual-display--itemId"] .ux-textspans--BOLD');
                    if (idElement) {
                        idToCopy = idElement.textContent.trim();
                    } else {
                        // バックアップ: 「eBay item number:」の隣のBOLDテキストを探す
                        const ebayNumberElements = document.querySelectorAll('.ux-textspans--SECONDARY');
                        for (let element of ebayNumberElements) {
                            if (element.textContent.includes('eBay item number:')) {
                                const boldElement = element.nextElementSibling;
                                if (boldElement && boldElement.classList.contains('ux-textspans--BOLD')) {
                                    idToCopy = boldElement.textContent.trim();
                                    break;
                                }
                            }
                        }

                        // それでも見つからない場合はURLからアイテムIDを抽出する試み
                        if (!idToCopy) {
                            const match = window.location.pathname.match(/\/(\d+)(?:\?|$)/);
                            if (match) {
                                idToCopy = match[1];
                            }
                        }
                    }
                }

                if (idToCopy) {
                    // クリップボードにコピー
                    GM_setClipboard(idToCopy);

                    // フィードバック表示
                    const originalBg = this.style.backgroundColor;
                    this.style.backgroundColor = 'rgb(44, 187, 93)';
                    this.textContent = 'ID済';

                    // 元に戻す
                    var self = this;
                    setTimeout(function() {
                        self.style.backgroundColor = originalBg;
                        self.textContent = 'アイテムID';
                    }, 1000);
                } else {
                    alert('アイテムIDが見つかりませんでした。');
                }
            });
        } catch (error) {
            console.error('商品ページコピーボタン追加エラー:', error);
        }
    }

    // ボタンのスタイルを適用する共通関数
    function applyButtonStyle(button, customStyles = {}) {
        // 基本スタイル
        const baseStyles = {
            padding: '4px 8px',
            fontSize: '12px',
            fontWeight: '500',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            zIndex: '10',
            minWidth: '50px',
            transform: 'translateY(-50%)'
        };

        // 基本スタイルとカスタムスタイルを結合
        const styles = Object.assign({}, baseStyles, customStyles);

        // スタイルをボタンに適用
        for (var prop in styles) {
            button.style[prop] = styles[prop];
        }
    }
})(); 