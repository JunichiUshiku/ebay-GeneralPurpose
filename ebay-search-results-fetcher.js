// ==UserScript==

// @name         eBay Search Results - Last Updated Fetcher (Parallel)
// @namespace    http://tampermonkey.net/
// @version      1.12 // 追加読み込み修正
// @description  Fetches and displays the last updated date for items on eBay search results page in Japan time (parallel processing).
// @author       You
// @match        https://www.ebay.com/sch/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    console.log("eBay Search Results - Last Updated Fetcher Script Started v1.12 (Incremental Loading)");

    const INITIAL_ITEMS_TO_DISPLAY = 20; // 初期表示数
    const INCREMENTAL_LOAD_COUNT = 20;   // 追加読み込み数
    let processedItemCount = 0;          // 現在までに処理したアイテム数を追跡
    const MAX_CONCURRENT_REQUESTS = 5;

    const ITEM_SELECTOR = 'li.s-item, div.s-item';
    const ITEM_ID_SELECTOR = '.s-item__item-id, .s-item__itemID';
    const DETAILS_SECTION_SELECTOR = '.s-item__details-section--secondary';

    // スタイルを追加
    GM_addStyle(`
      .load-more-items-btn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: #0066cc;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 10px 15px;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        z-index: 9999;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        transition: all 0.2s;
      }
      .load-more-items-btn:hover {
        background-color: #0055aa;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      }
      .load-more-items-btn.loading {
        background-color: #999;
        cursor: not-allowed;
      }
      .load-more-items-btn.completed {
        background-color: #28a745;
      }
    `);

    function formatLastUpdated(dateStringEbay) {
        if (!dateStringEbay || dateStringEbay === 'N/A' || dateStringEbay.toLowerCase().includes('error') || dateStringEbay.toLowerCase().includes('timeout')) {
            return dateStringEbay; // エラーやN/Aの場合はそのまま返す
        }
        try {
            const dateObj = new Date(dateStringEbay);
            if (isNaN(dateObj.getTime())) {
                console.warn("Could not parse date string:", dateStringEbay);
                return dateStringEbay;
            }
            const jstFormatter = new Intl.DateTimeFormat('ja-JP', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false, timeZone: 'Asia/Tokyo'
            });
            const parts = jstFormatter.formatToParts(dateObj).reduce((acc, part) => {
                acc[part.type] = part.value;
                return acc;
            }, {});
            const finalFormattedDate = `${parts.year}年${parts.month}月${parts.day}日`;
            const finalFormattedTime = `${parts.hour}:${parts.minute}:${parts.second}`;
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - dateObj.getTime());
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const elapsed = `(${diffDays}日経過)`;
            return `${finalFormattedDate} ${finalFormattedTime} ${elapsed}`;
        } catch (error) {
            console.error("Error formatting date:", dateStringEbay, error);
            return dateStringEbay;
        }
    }

    function fetchLastUpdatedPromise(itemId, itemElement) {
        return new Promise((resolve, reject) => {
            const itemPageUrl = `https://www.ebay.com/itm/${itemId}`;
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = itemPageUrl;
            iframe.sandbox = 'allow-scripts allow-same-origin';
            let resolved = false;
            const timeoutDuration = 10000;

            const cleanupAndResolve = (data) => {
                if (resolved) return;
                resolved = true;
                clearTimeout(timeoutId);
                if (document.body.contains(iframe)) iframe.remove();
                resolve({ itemElement, itemId, lastUpdatedText: data.lastUpdatedText, watchCount: data.watchCount, soldCount: data.soldCount, success: true });
            };

            const cleanupAndReject = (errorValue) => {
                if (resolved) return;
                resolved = true;
                clearTimeout(timeoutId);
                if (document.body.contains(iframe)) iframe.remove();
                reject({ itemElement, itemId, lastUpdatedText: (errorValue instanceof Error ? errorValue.message : errorValue), watchCount: null, soldCount: null, success: false });
            };

            const timeoutId = setTimeout(() => {
                 console.warn(`Timeout loading iframe for item ${itemId} at URL: ${itemPageUrl}`);
                 cleanupAndReject('Timeout loading iframe');
            }, timeoutDuration);

            iframe.onload = () => {
                try {
                    const doc = iframe.contentDocument;
                    if(!doc) {
                        console.warn(`iframe contentDocument is null for ${itemPageUrl}`);
                        cleanupAndReject('iframe contentDocument is null');
                        return;
                    }

                    let rawLastUpdatedText = 'N/A';
                    let watchCount = null;
                    let soldCount = null;

                    const revisionHistoryDiv = doc.querySelector('div.ux-layout-section__textual-display--revisionHistory');
                    if (revisionHistoryDiv) {
                        const spans = revisionHistoryDiv.querySelectorAll('span.ux-textspans');
                        if (spans.length > 1 && spans[1].textContent) {
                            rawLastUpdatedText = spans[1].textContent.trim();
                        }
                    }

                    const watchCounterElement = doc.querySelector('.x-watch-heart.x-watch-heart__watcher-counter');
                    if (watchCounterElement) {
                        const watchTextElement = watchCounterElement.querySelector('.x-watch-heart-btn-text');
                        if (watchTextElement && watchTextElement.textContent) {
                            watchCount = watchTextElement.textContent.trim();
                        }
                    }

                    const quantityInputWrapper = doc.querySelector('.x-quantity__inputwrapper');
                    if (quantityInputWrapper) {
                        const soldSpans = quantityInputWrapper.querySelectorAll('.ux-textspans.ux-textspans--BOLD.ux-textspans--EMPHASIS');
                        if (soldSpans.length > 0) {
                            soldCount = soldSpans[soldSpans.length - 1].textContent.trim();
                        }
                    }

                    cleanupAndResolve({ lastUpdatedText: rawLastUpdatedText, watchCount: watchCount, soldCount: soldCount });
                } catch (e) {
                    console.error(`Error parsing item page for item ${itemId} at URL ${itemPageUrl}:`, e);
                    cleanupAndReject('Error parsing iframe content');
                }
            };

            iframe.onerror = () => {
                console.error(`Error loading iframe for item ${itemId} at URL: ${itemPageUrl}`);
                cleanupAndReject('Error loading iframe');
            };
            document.body.appendChild(iframe);
        });
    }

    // ★★★ displayLastUpdated 関数の修正 ★★★
    function displayLastUpdated(itemElement, itemId, rawLastUpdatedText, watchCount, soldCount) {
        if (!itemElement) {
            console.error(`displayLastUpdated: itemElement is null for itemId: ${itemId}. Cannot display update.`);
            return;
        }

        const uniqueClassName = `custom-last-updated-for-${itemId.replace(/\s/g, '-')}`;

        const existingGlobalUpdateDiv = itemElement.querySelector(`.${uniqueClassName}`);
        if (existingGlobalUpdateDiv) {
            existingGlobalUpdateDiv.remove();
        }

        const updateDiv = document.createElement('div');
        updateDiv.className = `custom-last-updated ${uniqueClassName} s-item__detail s-item__detail--secondary`;
        updateDiv.style.color = 'green';
        updateDiv.style.fontWeight = 'bold';

        const formattedDisplaytext = formatLastUpdated(rawLastUpdatedText);

        let lastUpdatedLineHtml = '';
        const labelText = "更新日: ";
        let iconHtml = '';
        if (rawLastUpdatedText && rawLastUpdatedText !== 'N/A' && !rawLastUpdatedText.toLowerCase().includes('error') && !rawLastUpdatedText.toLowerCase().includes('timeout')) {
            const revisionHistoryUrl = `https://www.ebay.com/rvh/${itemId}`;
            iconHtml = ` <a href="${revisionHistoryUrl}" target="_blank" title="改訂履歴を見る" style="text-decoration: none; cursor: pointer; font-size: 1.2em; vertical-align: middle;">❗</a>`;
        }
        lastUpdatedLineHtml = `<span class="ux-textspans" style="white-space: pre;">${labelText}${formattedDisplaytext}${iconHtml}</span>`;

        let watchSoldLineHtml = '';
        const watchPart = (watchCount && watchCount !== 'N/A' && !String(watchCount).toLowerCase().includes('error')) ? `❤️${watchCount}` : '';
        const soldPart = (soldCount && soldCount !== 'N/A' && !String(soldCount).toLowerCase().includes('error')) ? `🎁${soldCount}` : '';

        if (watchPart && soldPart) {
            watchSoldLineHtml = `<div style="white-space: pre;">${watchPart} / ${soldPart}</div>`;
        } else if (watchPart) {
            watchSoldLineHtml = `<div style="white-space: pre;">${watchPart}</div>`;
        } else if (soldPart) {
            watchSoldLineHtml = `<div style="white-space: pre;">${soldPart}</div>`;
        }

        updateDiv.innerHTML = lastUpdatedLineHtml + watchSoldLineHtml;

        const categoryInfoDiv = itemElement.querySelector('div[id^="category-info-"]');
        if (categoryInfoDiv && categoryInfoDiv.parentNode) {
            categoryInfoDiv.parentNode.insertBefore(updateDiv, categoryInfoDiv.nextSibling);
            return;
        }
        const subtitleDiv = itemElement.querySelector('div.s-item__subtitle');
        if (subtitleDiv && subtitleDiv.parentNode) {
            subtitleDiv.parentNode.insertBefore(updateDiv, subtitleDiv.nextSibling);
            return;
        }
        const itemIdElement = itemElement.querySelector(ITEM_ID_SELECTOR);
        if (itemIdElement && itemIdElement.parentNode) {
            itemIdElement.parentNode.insertBefore(updateDiv, itemIdElement.nextSibling);
            return;
        }
        const detailsSection = itemElement.querySelector(DETAILS_SECTION_SELECTOR);
        if (detailsSection) {
            detailsSection.appendChild(updateDiv);
            return;
        }
        const infoDiv = itemElement.querySelector('.s-item__info');
        if (infoDiv) {
            infoDiv.appendChild(updateDiv);
        } else {
            console.warn(`Could not find a preferred insertion point for item ${itemId}, appending to itemElement itself.`, itemElement);
            itemElement.appendChild(updateDiv);
        }
    }

    async function processItemQueue(queue) {
        let currentIndex = 0;
        const totalItems = queue.length;
        while (currentIndex < totalItems) {
            const chunk = queue.slice(currentIndex, currentIndex + MAX_CONCURRENT_REQUESTS);
            currentIndex += MAX_CONCURRENT_REQUESTS;
            console.log(`Processing a chunk of ${chunk.length} items... (Starting from index ${currentIndex - chunk.length})`);
            const promises = chunk.map(({ itemElement, itemId }) =>
                fetchLastUpdatedPromise(itemId, itemElement)
                    .then(result => {
                        console.log(`Success: Item ID ${result.itemId}, Raw Updated: ${result.lastUpdatedText}, Watch: ${result.watchCount}, Sold: ${result.soldCount}`);
                        displayLastUpdated(result.itemElement, result.itemId, result.lastUpdatedText, result.watchCount, result.soldCount);
                    })
                    .catch(errorResult => {
                        console.error(`Failure: Item ID ${errorResult.itemId}, Reason: ${errorResult.lastUpdatedText}, Watch (err): ${errorResult.watchCount}, Sold (err): ${errorResult.soldCount}`);
                        displayLastUpdated(errorResult.itemElement, errorResult.itemId, errorResult.lastUpdatedText, errorResult.watchCount, errorResult.soldCount);
                    })
            );
            try {
                await Promise.allSettled(promises);
                console.log(`Chunk processed. Total items processed so far: ${Math.min(currentIndex, totalItems)}/${totalItems}`);
                if (currentIndex < totalItems) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                console.error("Error processing chunk with Promise.allSettled:", error);
            }
        }
        console.log("All items processed.");
    }

    async function scanAndProcessItems() {
        const items = document.querySelectorAll(ITEM_SELECTOR);
        console.log(`Found ${items.length} items in total.`);

        // 処理済みアイテムを特定するためのセレクタ
        const processedSelector = '.custom-last-updated';

        // まだ処理されていないアイテムを抽出
        const unprocessedItems = Array.from(items).filter(item => !item.querySelector(processedSelector));
        console.log(`Found ${unprocessedItems.length} unprocessed items.`);

        if (unprocessedItems.length === 0) {
            console.log('No unprocessed items found. All items have been processed.');
            return { processedCount: 0, hasMore: false };
        }

        // 処理対象アイテム数を制限（重要な修正：0からのスライスではなく、processedItemCount以降からINTIAL_ITEMS_TO_DISPLAYまたはINCREMENTAL_LOAD_COUNT個を取得）
        const itemsToProcess = unprocessedItems.slice(0, processedItemCount === 0 ? INITIAL_ITEMS_TO_DISPLAY : INCREMENTAL_LOAD_COUNT);
        console.log(`Will process ${itemsToProcess.length} new items. (Total processed so far: ${processedItemCount})`);

        // 処理キューを構築
        const queue = [];
        for (const itemElement of itemsToProcess) {
            const itemIdElement = itemElement.querySelector(ITEM_ID_SELECTOR);
            if (!itemIdElement) {
                console.warn("Item ID element not found for item:", itemElement);
                continue;
            }
            const itemIdText = itemIdElement.textContent;
            const match = itemIdText.match(/(\d+)/);
            if (!match) {
                console.warn(`No numeric ItemID found in text: ${itemIdText}`);
                continue;
            }
            const itemId = match[1];
            queue.push({ itemElement, itemId });
        }

        // キューを処理
        await processItemQueue(queue);

        // 処理したアイテム数を累積
        processedItemCount += queue.length;

        // 処理結果を返す（処理数と残りの有無）
        return {
            processedCount: queue.length,
            hasMore: unprocessedItems.length > itemsToProcess.length
        };
    }

    // 制限解除ボタンを作成して追加する関数
    function addLoadMoreItemsButton() {
        const existingButton = document.querySelector('.load-more-items-btn');
        if (existingButton) {
            return existingButton; // すでに存在する場合は既存のボタンを返す
        }

        const button = document.createElement('button');
        button.className = 'load-more-items-btn loading'; // 初期状態で loading クラスを追加
        button.textContent = '読み込み中...'; // 初期表示時は「読み込み中...」と表示
        button.title = '未処理の商品情報をさらに20個取得します';

        button.addEventListener('click', async function() {
            if (button.classList.contains('loading') || button.classList.contains('completed')) return;

            button.classList.add('loading');
            button.textContent = '取得中...';

            // currentDisplayLimitを使う代わりに、processedItemCountで追跡管理（この行は削除）
            // currentDisplayLimit += INCREMENTAL_LOAD_COUNT;

            try {
                // 未処理のアイテムを再スキャンして処理する
                const result = await scanAndProcessItems();

                if (result.processedCount > 0) {
                    // 追加で処理できたアイテムがある
                    button.textContent = `${result.processedCount}個を読み込みました`;
                    setTimeout(() => {
                        if (result.hasMore) {
                            // まだ未処理のアイテムがある場合
                            button.textContent = 'さらに20個読み込む';
                            button.classList.remove('loading');
                        } else {
                            // すべてのアイテムを処理し終えた場合
                            button.textContent = 'すべて読み込み済み';
                            button.classList.remove('loading');
                            button.classList.add('completed');
                        }
                    }, 2000);
                } else if (!result.hasMore) {
                    // 処理したアイテムがなく、残りもない場合
                    button.textContent = 'すべて読み込み済み';
                    button.classList.remove('loading');
                    button.classList.add('completed');
                } else {
                    // 処理したアイテムがなく、残りがある場合（想定外のケース）
                    button.textContent = '読み込みエラー';
                    setTimeout(() => {
                        button.textContent = 'さらに20個読み込む';
                        button.classList.remove('loading');
                    }, 2000);
                }
            } catch (err) {
                console.error('情報取得中にエラーが発生しました:', err);
                button.textContent = 'エラー発生';
                setTimeout(() => {
                    button.textContent = 'さらに20個読み込む';
                    button.classList.remove('loading');
                }, 2000);
            }
        });

        document.body.appendChild(button);
        return button;
    }

    // ★★★ initialize 関数の修正 ★★★
    function initialize() {
        // ボタンをまず先に作成して「読み込み中」の状態で表示
        const loadMoreButton = addLoadMoreItemsButton();

        // ページロード/DOMContentLoaded後にスキャンを開始
        window.addEventListener('load', async function() {
            console.log("Window load event fired - starting scan");
            const initialResult = await scanAndProcessItems();

            // 初期読み込みの結果に応じてボタンの状態を設定
            updateButtonAfterInitialLoad(loadMoreButton, initialResult);
        });

        // DOMContentLoaded で試みることで、Window load 前に表示できる可能性を高める
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', async function() {
                console.log("DOMContentLoaded event fired - starting scan");
                const initialResult = await scanAndProcessItems();

                // 初期読み込みの結果に応じてボタンの状態を設定
                updateButtonAfterInitialLoad(loadMoreButton, initialResult);
            });
        } else {
            // すでにDOMContentLoadedが発生している場合は即時実行
            console.log("Document already loaded - starting scan immediately");
            (async () => {
                const initialResult = await scanAndProcessItems();

                // 初期読み込みの結果に応じてボタンの状態を設定
                updateButtonAfterInitialLoad(loadMoreButton, initialResult);
            })();
        }
    }

    // 初期読み込み後、結果に基づいてボタンの状態を更新する関数
    function updateButtonAfterInitialLoad(button, result) {
        if (!result.hasMore) {
            // すべてのアイテムが読み込まれた場合
            button.textContent = 'すべて読み込み済み';
            button.classList.remove('loading');
            button.classList.add('completed');
        } else {
            // まだ読み込むべきアイテムがある場合
            button.textContent = 'さらに20個読み込む';
            button.classList.remove('loading');
        }

        // 読み込んだアイテム数の通知（オプション - 必要に応じて）
        if (result.processedCount > 0) {
            console.log(`初期表示: ${result.processedCount}個のアイテムを読み込みました`);
        }
    }

    // スクリプトを初期化
    initialize();
})(); 