// ==UserScript==
// @name         eBay Research & Item タイトル・画像URL・アイテムIDコピーボタン
// @namespace    https://example.com/
// @version      1.3
// @description  eBay ResearchページとItem個別ページと検索結果ページの商品タイトル、画像URL、アイテムIDをコピーできるボタンを追加
// @match        *://*.ebay.com/sh/research*
// @match        *://*.ebay.com/itm/*
// @match        *://*.ebay.com/sch/*
// @run-at       document-idle
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
    'use strict';

    // debounce関数：連続するイベントをまとめ、最後のイベントから指定時間後に一度だけ関数を実行
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ページURLに基づいて適切な処理を実行
    const currentUrl = window.location.href;

    if (currentUrl.includes('/sh/research')) {
        // リサーチページ用の処理
        initResearchPage();
    } else if (currentUrl.includes('/itm/')) {
        // 商品個別ページ用の処理
        initItemPage();
    } else if (currentUrl.includes('/sch/')) {
        // 検索結果ページ用の処理
        initSearchPage();
    }

    // リサーチページ用の初期化
    function initResearchPage() {
        // ページ初期ロード時にボタンを追加
        window.addEventListener('load', function() {
            setTimeout(addCopyButtonsToResearch, 1000);
        });

        const debouncedAddButtons = debounce(addCopyButtonsToResearch, 200);

        // DOM変更を監視
        const observer = new MutationObserver(function(mutations) {
            let needsUpdate = false;
            mutations.forEach(function(mutation) {
                // DOMのノードが追加または削除された場合に再スキャンを実行
                // これにより、行の再レンダリングでボタンが消えても再追加される
                if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
                    needsUpdate = true;
                }
            });
            if (needsUpdate) {
                debouncedAddButtons();
            }
        });

        // 監視設定：子ノードの変更（追加・削除）を監視
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 商品個別ページ用の初期化
    function initItemPage() {
        // ページ初期ロード時にボタンを追加
        window.addEventListener('load', function() {
            setTimeout(addCopyButtonsToItemPage, 1000);
        });

        const debouncedAddButtons = debounce(addCopyButtonsToItemPage, 200);

        // DOM変更を監視（商品ページの画像やタイトルが動的に読み込まれる場合に備える）
        const observer = new MutationObserver(function(mutations) {
            let needsUpdate = false;
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0 || mutation.type === 'attributes') {
                    needsUpdate = true;
                }
            });
            if (needsUpdate) {
                debouncedAddButtons();
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

    // 検索結果ページ用の初期化
    function initSearchPage() {
        // ページ初期ロード時にボタンを追加
        window.addEventListener('load', function() {
            setTimeout(addCopyButtonsToSearchPage, 1000);
        });

        const debouncedAddButtons = debounce(addCopyButtonsToSearchPage, 200);

        // DOM変更を監視
        const observer = new MutationObserver(function(mutations) {
            let needsUpdate = false;
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0 || mutation.type === 'attributes') {
                    needsUpdate = true;
                }
            });
            if (needsUpdate) {
                debouncedAddButtons();
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
            // 商品リストの各行を取得（セレクターをより具体的に）
            const productRows = document.querySelectorAll('.sold-result-table tr.research-table-row');

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

                // ボタンを配置する基準となるセル（最初のセル）を特定
                const firstCell = row.querySelector('td.research-table-row__item');
                if (!firstCell) continue;

                // セルにポジション設定（absoluteポジショニングのため）
                if (getComputedStyle(firstCell).position === 'static') {
                    firstCell.style.position = 'relative';
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

                // ハイライトクリアボタンの作成
                var btnClear = document.createElement('button');
                btnClear.className = 'tm-clear-highlight-btn';
                btnClear.textContent = 'クリア';
                btnClear.title = 'ハイライトをクリア';

                // タイトルコピーボタンのスタイル設定
                applyButtonStyle(btnTitle, {
                    position: 'absolute',
                    left: '-65px',
                    top: 'calc(50% - 23px)', // ボタン群を中央揃えにし、3px間隔にするための調整
                    background: 'rgb(3, 102, 214)' // 青色
                });

                // 画像URLコピーボタンのスタイル設定
                applyButtonStyle(btnImage, {
                    position: 'absolute',
                    left: '-65px',
                    top: '50%', // ボタン群の中心
                    background: 'rgb(76, 175, 80)' // 緑色
                });

                // ハイライトクリアボタンのスタイル設定
                applyButtonStyle(btnClear, {
                    position: 'absolute',
                    left: '-65px',
                    top: 'calc(50% + 23px)', // ボタン群を中央揃えにし、3px間隔にするための調整
                    background: 'rgb(255, 87, 51)' // オレンジ色
                });

                // タイトルコピーボタンのクリックイベントを設定
                (function(span, btn) {
                    btn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        // タイトルテキストを取得
                        const titleText = span.textContent.trim();
                        
                        // クリップボードにコピー
                        GM_setClipboard(titleText);

                        // キーワード配列を作成（Chrome拡張機能との連携用）
                        const keywords = titleText.split(/\s+/).filter(k => k.length > 0);

                        // ===== Chrome拡張機能との連携（いつでも削除可能） =====
                        // キーワードマーカー拡張機能へ通知
                        console.log('🔍 リサーチページ - 商品名ボタンがクリックされました');
                        console.log('🔍 抽出されたキーワード:', keywords);
                        
                        // 拡張機能の存在確認
                        if (typeof window.keywordMarkerInitialized !== 'undefined') {
                            console.log('✅ キーワードマーカー拡張機能が検出されました');
                        } else {
                            console.log('❌ キーワードマーカー拡張機能が検出されません');
                        }
                        
                        try {
                            const customEvent = new CustomEvent('userscript-keyword-highlight', {
                                detail: {
                                    keywords: keywords,
                                    source: 'ebay-copy-title-userscript'
                                }
                            });
                            
                            console.log('🔄 カスタムイベントを発火中...', customEvent);
                            document.dispatchEvent(customEvent);
                            console.log('✅ キーワードマーカー拡張機能に通知送信完了:', keywords);
                            
                            // イベントが正しく設定されているかの確認
                            setTimeout(function() {
                                const highlightedElements = document.querySelectorAll('span.keyword-highlight-span');
                                console.log('🎨 ハイライト要素数:', highlightedElements.length);
                                if (highlightedElements.length > 0) {
                                    console.log('✅ ハイライトが正常に適用されました');
                                } else {
                                    console.log('❌ ハイライトが適用されていません');
                                }
                            }, 500);
                            
                        } catch (error) {
                            console.error('❌ キーワードマーカー拡張機能への通知に失敗:', error);
                        }
                        // ===== Chrome拡張機能連携ここまで =====

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

                // ハイライトクリアボタンのクリックイベントを設定
                btnClear.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    // Chrome拡張機能へクリア要求を送信
                    try {
                        const customEvent = new CustomEvent('userscript-keyword-highlight', {
                            detail: {
                                keywords: [],
                                action: 'clear',
                                source: 'ebay-copy-title-userscript'
                            }
                        });
                        document.dispatchEvent(customEvent);
                        console.log('キーワードマーカー拡張機能にクリア要求送信');
                    } catch (error) {
                        console.log('キーワードマーカー拡張機能へのクリア要求に失敗:', error);
                    }

                    // フィードバック表示
                    const originalBg = this.style.backgroundColor;
                    this.style.backgroundColor = 'rgb(44, 187, 93)';
                    this.textContent = 'クリア済';

                    // 元に戻す
                    var self = this;
                    setTimeout(function() {
                        self.style.backgroundColor = originalBg;
                        self.textContent = 'クリア';
                    }, 1000);
                });

                // ボタンを最初のセルに追加
                firstCell.appendChild(btnTitle);
                firstCell.appendChild(btnImage);
                firstCell.appendChild(btnClear);
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

            // ハイライトクリアボタンの作成
            var btnClear = document.createElement('button');
            btnClear.className = 'tm-item-clear-highlight-btn';
            btnClear.textContent = 'クリア';
            btnClear.title = 'ハイライトをクリア';

            // ボタンのスタイル設定（Amazon ボタンと同じ高さに合わせる）
            const buttonStyle = 'margin-right: 5px; padding: 5px 10px; border: none; border-radius: 4px; color: white; font-weight: bold; cursor: pointer; height: 30px; line-height: 1;';
            btnTitle.style.cssText = buttonStyle + 'background-color: rgb(3, 102, 214);'; // 青色
            btnImage.style.cssText = buttonStyle + 'background-color: rgb(76, 175, 80);';  // 緑色
            btnItemId.style.cssText = buttonStyle + 'background-color: rgb(156, 39, 176);'; // 紫色
            btnClear.style.cssText = buttonStyle + 'background-color: rgb(255, 87, 51);'; // オレンジ色

            // ボタンをコンテナに追加
            buttonContainer.appendChild(btnTitle);
            buttonContainer.appendChild(btnImage);
            buttonContainer.appendChild(btnItemId);
            buttonContainer.appendChild(btnClear);

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

                // タイトルテキストを取得
                const titleText = titleElement.textContent.trim();
                
                // クリップボードにコピー
                GM_setClipboard(titleText);

                // キーワード配列を作成（Chrome拡張機能との連携用）
                const keywords = titleText.split(/\s+/).filter(k => k.length > 0);

                // ===== Chrome拡張機能との連携（いつでも削除可能） =====
                // キーワードマーカー拡張機能へ通知
                console.log('🔍 商品個別ページ - 商品名ボタンがクリックされました');
                console.log('🔍 抽出されたキーワード:', keywords);
                
                // 拡張機能の存在確認
                if (typeof window.keywordMarkerInitialized !== 'undefined') {
                    console.log('✅ キーワードマーカー拡張機能が検出されました');
                } else {
                    console.log('❌ キーワードマーカー拡張機能が検出されません');
                }
                
                try {
                    const customEvent = new CustomEvent('userscript-keyword-highlight', {
                        detail: {
                            keywords: keywords,
                            source: 'ebay-copy-title-userscript'
                        }
                    });
                    
                    console.log('🔄 カスタムイベントを発火中...', customEvent);
                    document.dispatchEvent(customEvent);
                    console.log('✅ キーワードマーカー拡張機能に通知送信完了:', keywords);
                    
                    // イベントが正しく設定されているかの確認
                    setTimeout(function() {
                        const highlightedElements = document.querySelectorAll('span.keyword-highlight-span');
                        console.log('🎨 ハイライト要素数:', highlightedElements.length);
                        if (highlightedElements.length > 0) {
                            console.log('✅ ハイライトが正常に適用されました');
                        } else {
                            console.log('❌ ハイライトが適用されていません');
                        }
                    }, 500);
                    
                } catch (error) {
                    console.error('❌ キーワードマーカー拡張機能への通知に失敗:', error);
                }
                // ===== Chrome拡張機能連携ここまで =====

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
                        // バックアップ: "eBay item number:"の隣のBOLDテキストを探す
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

            // ハイライトクリアボタンのクリックイベント
            btnClear.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                // Chrome拡張機能へクリア要求を送信
                try {
                    const customEvent = new CustomEvent('userscript-keyword-highlight', {
                        detail: {
                            keywords: [],
                            action: 'clear',
                            source: 'ebay-copy-title-userscript'
                        }
                    });
                    document.dispatchEvent(customEvent);
                    console.log('キーワードマーカー拡張機能にクリア要求送信');
                } catch (error) {
                    console.log('キーワードマーカー拡張機能へのクリア要求に失敗:', error);
                }

                // フィードバック表示
                const originalBg = this.style.backgroundColor;
                this.style.backgroundColor = 'rgb(44, 187, 93)';
                this.textContent = 'クリア済';

                // 元に戻す
                var self = this;
                setTimeout(function() {
                    self.style.backgroundColor = originalBg;
                    self.textContent = 'クリア';
                }, 1000);
            });
        } catch (error) {
            console.error('商品ページコピーボタン追加エラー:', error);
        }
    }

    // 検索結果ページに商品リストのコピーボタンを追加
    function addCopyButtonsToSearchPage() {
        try {
            // 検索結果の各商品アイテムを取得
            const searchItems = document.querySelectorAll('li.s-card');

            // 各商品に処理を適用
            for (var i = 0; i < searchItems.length; i++) {
                var item = searchItems[i];

                // すでにボタンが追加されている商品はスキップ
                if (item.querySelector('.tm-search-copy-title-btn')) continue;

                // 商品タイトル要素を特定
                const titleElement = item.querySelector('.s-card__title .su-styled-text.primary.default');
                if (!titleElement) continue;

                // アイテムIDを属性セクションから抽出
                const itemIdElement = item.querySelector('.su-card-container__attributes__secondary .su-styled-text');
                if (!itemIdElement) continue;

                let itemId = '';
                // "Item: 396213183782" の形式から数字部分を抽出
                const itemIdSpans = item.querySelectorAll('.su-card-container__attributes__secondary .su-styled-text');
                for (let span of itemIdSpans) {
                    const text = span.textContent.trim();
                    const match = text.match(/Item:\s*(\d+)/);
                    if (match) {
                        itemId = match[1];
                        break;
                    }
                }
                
                if (!itemId) continue;

                // ボタンを配置する場所を特定（su-card-container__headerクラス内のsu-linkクラスの下）
                const headerElement = item.querySelector('.su-card-container__header');
                if (!headerElement) continue;
                
                const linkElement = headerElement.querySelector('.su-link');
                if (!linkElement) continue;

                // ボタンコンテナを作成
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'tm-search-buttons-container';
                buttonContainer.style.cssText = 'display: flex; margin-bottom: 5px; gap: 5px;';

                // 商品名コピーボタンの作成
                var btnTitle = document.createElement('button');
                btnTitle.className = 'tm-search-copy-title-btn';
                btnTitle.textContent = '商品名';
                btnTitle.title = 'タイトルをコピー';

                // アイテムIDコピーボタンの作成
                var btnItemId = document.createElement('button');
                btnItemId.className = 'tm-search-copy-id-btn';
                btnItemId.textContent = 'アイテムID';
                btnItemId.title = 'アイテムIDをコピー';

                // ハイライトクリアボタンの作成
                var btnClear = document.createElement('button');
                btnClear.className = 'tm-search-clear-highlight-btn';
                btnClear.textContent = 'クリア';
                btnClear.title = 'ハイライトをクリア';

                // ボタンのスタイル設定
                const buttonStyle = 'padding: 4px 8px; font-size: 12px; font-weight: 500; color: white; border: none; border-radius: 4px; cursor: pointer; min-width: 60px;';
                btnTitle.style.cssText = buttonStyle + 'background-color: rgb(3, 102, 214);'; // 青色
                btnItemId.style.cssText = buttonStyle + 'background-color: rgb(156, 39, 176);'; // 紫色
                btnClear.style.cssText = buttonStyle + 'background-color: rgb(255, 87, 51);'; // オレンジ色

                // 商品名コピーボタンのクリックイベント
                (function(titleEl, btn) {
                    btn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        // タイトルテキストを取得
                        const titleText = titleEl.textContent.trim();
                        
                        // クリップボードにコピー
                        GM_setClipboard(titleText);

                        // キーワード配列を作成（Chrome拡張機能との連携用）
                        const keywords = titleText.split(/\s+/).filter(k => k.length > 0);

                        // ===== Chrome拡張機能との連携（いつでも削除可能） =====
                        // キーワードマーカー拡張機能へ通知
                        console.log('🔍 検索結果ページ - 商品名ボタンがクリックされました');
                        console.log('🔍 抽出されたキーワード:', keywords);
                        
                        // 拡張機能の存在確認
                        if (typeof window.keywordMarkerInitialized !== 'undefined') {
                            console.log('✅ キーワードマーカー拡張機能が検出されました');
                        } else {
                            console.log('❌ キーワードマーカー拡張機能が検出されません');
                        }
                        
                        try {
                            const customEvent = new CustomEvent('userscript-keyword-highlight', {
                                detail: {
                                    keywords: keywords,
                                    source: 'ebay-copy-title-userscript'
                                }
                            });
                            
                            console.log('🔄 カスタムイベントを発火中...', customEvent);
                            document.dispatchEvent(customEvent);
                            console.log('✅ キーワードマーカー拡張機能に通知送信完了:', keywords);
                            
                            // イベントが正しく設定されているかの確認
                            setTimeout(function() {
                                const highlightedElements = document.querySelectorAll('span.keyword-highlight-span');
                                console.log('🎨 ハイライト要素数:', highlightedElements.length);
                                if (highlightedElements.length > 0) {
                                    console.log('✅ ハイライトが正常に適用されました');
                                } else {
                                    console.log('❌ ハイライトが適用されていません');
                                }
                            }, 500);
                            
                        } catch (error) {
                            console.error('❌ キーワードマーカー拡張機能への通知に失敗:', error);
                        }
                        // ===== Chrome拡張機能連携ここまで =====

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
                })(titleElement, btnTitle);

                // アイテムIDコピーボタンのクリックイベント
                (function(itemIdValue, btn) {
                    btn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        // クリップボードにコピー
                        GM_setClipboard(itemIdValue);

                        // フィードバック表示
                        const originalBg = btn.style.backgroundColor;
                        btn.style.backgroundColor = 'rgb(44, 187, 93)';
                        btn.textContent = 'ID済';

                        // 元に戻す
                        setTimeout(function() {
                            btn.style.backgroundColor = originalBg;
                            btn.textContent = 'アイテムID';
                        }, 1000);
                    });
                })(itemId, btnItemId);

                // ハイライトクリアボタンのクリックイベント
                btnClear.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    // Chrome拡張機能へクリア要求を送信
                    try {
                        const customEvent = new CustomEvent('userscript-keyword-highlight', {
                            detail: {
                                keywords: [],
                                action: 'clear',
                                source: 'ebay-copy-title-userscript'
                            }
                        });
                        document.dispatchEvent(customEvent);
                        console.log('キーワードマーカー拡張機能にクリア要求送信');
                    } catch (error) {
                        console.log('キーワードマーカー拡張機能へのクリア要求に失敗:', error);
                    }

                    // フィードバック表示
                    const originalBg = this.style.backgroundColor;
                    this.style.backgroundColor = 'rgb(44, 187, 93)';
                    this.textContent = 'クリア済';

                    // 元に戻す
                    var self = this;
                    setTimeout(function() {
                        self.style.backgroundColor = originalBg;
                        self.textContent = 'クリア';
                    }, 1000);
                });

                // ボタンをコンテナに追加
                buttonContainer.appendChild(btnTitle);
                buttonContainer.appendChild(btnItemId);
                buttonContainer.appendChild(btnClear);

                // コンテナをsu-linkの下に挿入
                linkElement.parentNode.insertBefore(buttonContainer, linkElement.nextSibling);
            }
        } catch (error) {
            console.error('検索結果ページコピーボタン追加エラー:', error);
        }
    }

    // ボタンのスタイルを適用する共通関数
    function applyButtonStyle(button, customStyles = {}) {
        // 基本スタイル
        const baseStyles = {
            padding: '3px 6px',
            fontSize: '11px',
            fontWeight: '500',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            zIndex: '10',
            minWidth: '45px',
            height: '20px',
            lineHeight: '1',
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