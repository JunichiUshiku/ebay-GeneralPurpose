// ==UserScript==
// @name         ヤフオク・メルカリ・ラクマ・PayPayフリマ・eBay・ネットモール 商品画像ダウンロード（完全版）
// @namespace    https://example.com/
// @version      1.8
// @description  ヤフオク・メルカリ・ラクマ・PayPayフリマ・eBay・ネットモールの商品ページの画像をダウンロードします
// @author       Your Name
// @match        https://auctions.yahoo.co.jp/jp/auction/*
// @match        https://page.auctions.yahoo.co.jp/jp/auction/*
// @match        https://paypayfleamarket.yahoo.co.jp/item/*
// @match        https://item.fril.jp/*
// @match        https://jp.mercari.com/item/*
// @match        https://jp.mercari.com/shops/*
// @match        https://www.mercari.com/jp/items/*
// @match        https://www.ebay.com/itm/*
// @match        https://netmall.hardoff.co.jp/product/*
// @grant        GM_download
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // スタイルを追加
    GM_addStyle(`
        .ec-image-downloader {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(66, 66, 66, 0.95);
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            font-family: 'Helvetica Neue', Arial, sans-serif;
            min-width: 220px;
        }
        /* サイト別の背景色 */
        .ec-image-downloader.paypay {
            background: rgba(255, 0, 76, 0.95);
        }
        .ec-image-downloader.rakuma {
            background: rgba(255, 75, 0, 0.95);
        }
        .ec-image-downloader.mercari {
            background: rgba(234, 53, 45, 0.95);
        }
        .ec-image-downloader.yahooauc {
            background: rgba(255, 51, 0, 0.95);
        }
        .ec-image-downloader.ebay {
            background: rgba(0, 113, 207, 0.95);
        }
        .ec-image-downloader.netmall {
            background: rgba(0, 128, 0, 0.95);
        }
        
        /* 共通タイトルスタイル */
        .ec-image-downloader-title {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            font-weight: bold;
            font-size: 14px;
        }
        .ec-image-downloader-icon {
            margin-right: 8px;
            font-size: 16px;
        }
        
        /* 共通ボタンスタイル */
        .ec-image-downloader-btn {
            background: white;
            color: #424242;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 5px;
            font-weight: bold;
            transition: background 0.2s;
        }
        /* サイト別のボタン色 */
        .paypay .ec-image-downloader-btn {
            color: #ff004c;
        }
        .rakuma .ec-image-downloader-btn {
            color: #ff4b00;
        }
        .mercari .ec-image-downloader-btn {
            color: #ea352d;
        }
        .yahooauc .ec-image-downloader-btn {
            color: #ff3300;
        }
        .ebay .ec-image-downloader-btn {
            color: #0071cf;
        }
        .netmall .ec-image-downloader-btn {
            color: #008000;
        }
        /* 共通ボタンホバー/無効状態 */
        .ec-image-downloader-btn:hover {
            background: #f8f8f8;
        }
        .ec-image-downloader-btn:disabled {
            background: #eee;
            color: #999;
            cursor: not-allowed;
        }
        
        /* 共通ステータステキスト */
        .ec-image-downloader-status {
            margin-top: 8px;
            font-size: 12px;
        }
        
        /* 共通カウンタースタイル */
        .ec-image-downloader-count {
            background: white;
            color: #424242;
            border-radius: 10px;
            padding: 2px 6px;
            margin-left: 5px;
            font-size: 12px;
        }
        /* サイト別のカウンター色 */
        .paypay .ec-image-downloader-count {
            color: #ff004c;
        }
        .rakuma .ec-image-downloader-count {
            color: #ff4b00;
        }
        .mercari .ec-image-downloader-count {
            color: #ea352d;
        }
        .yahooauc .ec-image-downloader-count {
            color: #ff3300;
        }
        .ebay .ec-image-downloader-count {
            color: #0071cf;
        }
        .netmall .ec-image-downloader-count {
            color: #008000;
        }
        
        /* 共通最小化ボタン */
        .ec-minimize-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 16px;
            padding: 0;
            line-height: 1;
        }
        
        /* 共通最小化状態 */
        .ec-minimized {
            min-width: auto;
            padding: 10px;
        }
        .ec-minimized > * {
            display: none;
        }
        .ec-minimized > .ec-minimize-btn {
            display: block;
        }
        .ec-minimized > .ec-image-downloader-title {
            display: flex;
        }
        
        /* 共通プログレスバー */
        .ec-download-progress {
            height: 4px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 2px;
            margin-top: 8px;
            overflow: hidden;
        }
        .ec-download-progress-bar {
            height: 100%;
            background: white;
            width: 0%;
            transition: width 0.3s;
        }
        
        /* フッター */
        .ec-image-downloader-footer {
            margin-top: 5px;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
            font-size: 12px;
            text-align: center;
            opacity: 0.7;
        }
    `);

    // グローバル変数
    let currentSite = '';
    let currentItemId = '';
    let downloadPanel = null;
    let imageCountElement = null;
    let downloadButton = null;
    let statusElement = null;
    let progressBarElement = null;
    let isDownloading = false;

    // サイトの種類を判断
    function detectSite() {
        const host = window.location.hostname;
        const path = window.location.pathname;

        if (host.includes('auctions.yahoo.co.jp') || host.includes('page.auctions.yahoo.co.jp')) {
            // ヤフオクの商品ページかチェック
            if (path.includes('/auction/')) {
                return 'yahooauc';
            }
        }
        else if (host.includes('paypayfleamarket.yahoo.co.jp')) {
            // PayPayフリマの商品ページかチェック
            if (path.includes('/item/')) {
                return 'paypay';
            }
        }
        else if (host.includes('fril.jp')) {
            // ラクマの商品ページかチェック
            if (path.match(/\/[a-z0-9]+$/)) { // 商品ID形式であるか確認
                return 'rakuma';
            }
        }
        else if (host.includes('mercari.com')) {
            // メルカリの商品ページかチェック
            if (path.includes('/item/m') || path.includes('/items/m')) {
                return 'mercari';
            }
            // メルカリショップのページかチェック
            else if (path.includes('/shops/')) {
                return 'mercari-shops';
            }
        }
        else if (host.includes('ebay.com')) {
            // eBayの商品ページかチェック
            if (path.includes('/itm/')) {
                return 'ebay';
            }
        }
        else if (host.includes('netmall.hardoff.co.jp')) {
            // ネットモールの商品ページかチェック
            if (path.includes('/product/')) {
                return 'netmall';
            }
        }

        return 'unknown';
    }

    // 現在のページが商品ページかどうかをチェック
    function isProductPage() {
        const site = detectSite();
        return site !== 'unknown';
    }

    // サイト別の名称を取得
    function getSiteName(site) {
        switch(site) {
            case 'yahooauc': return 'ヤフオク';
            case 'paypay': return 'PayPayフリマ';
            case 'rakuma': return 'ラクマ';
            case 'mercari': return 'メルカリ';
            case 'mercari-shops': return 'メルカリショップ';
            case 'ebay': return 'eBay';
            case 'netmall': return 'ネットモール';
            default: return 'ECサイト';
        }
    }

    // 重複を削除した一意の画像URLリストを作成
    function getUniqueImageUrls(urls) {
        // クローン画像を削除（ヤフオク特有の問題）
        const uniqueUrls = new Set();
        const urlMap = new Map(); // URL -> ファイル名の対応を保存

        urls.forEach(url => {
            // URLからファイル部分を抽出
            const parts = url.split('/');
            const filename = parts[parts.length - 1].split('?')[0];

            // すでに同じファイル名が存在するか確認
            if (!urlMap.has(filename)) {
                urlMap.set(filename, url);
                uniqueUrls.add(url);
            }
        });

        return Array.from(uniqueUrls);
    }

    // サイトに応じた画像URLを取得する関数
    function getImageUrls() {
        const imageUrls = new Set();
        const site = currentSite;

        if (site === 'yahooauc') {
            // ヤフオクの画像を取得
            // 指定された slick-slide クラスのコンテナから画像を抽出
            document.querySelectorAll('.slick-slide img[src*="auctions.c.yimg.jp"]').forEach(img => {
                if (img.src) {
                    // クエリパラメータを除去
                    const url = img.src.split('?')[0];
                    imageUrls.add(url);
                }
            });

            // バックアップ方法: 大きいサイズの画像を直接探す
            if (imageUrls.size === 0) {
                // gOFKtZ、kJjnAt などのクラスを持つ画像を探す（ヤフオク特有のクラス）
                document.querySelectorAll('img.sc-7f8d3a42-4, img.sc-7f8d3a42-5, img.gOFKtZ, img.kJjnAt').forEach(img => {
                    if (img.src && img.src.includes('auctions.c.yimg.jp')) {
                        const url = img.src.split('?')[0];
                        imageUrls.add(url);
                    }
                });
            }

            // さらにバックアップ：width属性が大きい画像（高解像度の可能性が高い）
            if (imageUrls.size === 0) {
                document.querySelectorAll('img[width][src*="auctions.c.yimg.jp"]').forEach(img => {
                    if (img.src && parseInt(img.getAttribute('width')) > 300) {
                        const url = img.src.split('?')[0];
                        imageUrls.add(url);
                    }
                });
            }

            // 最終手段: すべてのオークション画像
            if (imageUrls.size === 0) {
                document.querySelectorAll('img[src*="auctions.c.yimg.jp/images.auctions"]').forEach(img => {
                    if (img.src) {
                        const url = img.src.split('?')[0];
                        imageUrls.add(url);
                    }
                });
            }

            // slick-cloned を含む重複を削除
            return getUniqueImageUrls(Array.from(imageUrls));
        }
        else if (site === 'paypay') {
            // PayPayフリマの画像を取得
            // 特定の要素（slick-trackの中のフリマサムネイル）から画像を取得
            const slickTrack = document.querySelector('.slick-track');
            if (slickTrack) {
                // クラス名に"sc-c97c4bf7-3"を持つ画像要素をすべて取得
                const thumbnailImages = slickTrack.querySelectorAll('.sc-c97c4bf7-3');

                if (thumbnailImages.length === 0) {
                    console.warn('特定クラスのサムネイル画像が見つかりません、代替セレクタを試行します');
                    // 代替手段1: slick-track内の任意のimg要素を検索
                    const alternativeImages = slickTrack.querySelectorAll('img[src*="auctions.c.yimg.jp"]');
                    alternativeImages.forEach(img => {
                        if (img.src) {
                            imageUrls.add(img.src);
                        }
                    });

                    // 代替手段2: それでも見つからない場合は、別のクラス名を持つ可能性のある画像を検索
                    if (imageUrls.size === 0) {
                        const anyImages = slickTrack.querySelectorAll('img');
                        anyImages.forEach(img => {
                            if (img.src && img.src.includes('auctions.c.yimg.jp')) {
                                imageUrls.add(img.src);
                            }
                        });
                    }
                } else {
                    thumbnailImages.forEach(img => {
                        if (img.src) {
                            imageUrls.add(img.src);
                        }
                    });
                }
            }

            return Array.from(imageUrls);
        }
        else if (site === 'rakuma') {
            // ラクマの画像を取得
            // SP-SLIDESからすべての画像を取得
            document.querySelectorAll('.sp-slide img[src*="img.fril.jp"]').forEach(img => {
                let url = img.src;
                if (url) {
                    // クエリパラメータを除去
                    url = url.split('?')[0];
                    imageUrls.add(url);
                }
            });

            // SP-IMAGE-CONTAINERからの画像も取得
            document.querySelectorAll('.sp-image-container img').forEach(img => {
                let url = img.src;
                if (url) {
                    url = url.split('?')[0];
                    imageUrls.add(url);
                }
            });

            // data-defaultも確認
            document.querySelectorAll('img[data-default]').forEach(img => {
                let url = img.getAttribute('data-default');
                if (url) {
                    url = url.split('?')[0];
                    imageUrls.add(url);
                }
            });

            // それでも見つからない場合の代替手段
            if (imageUrls.size === 0) {
                document.querySelectorAll('img[src*="img.fril.jp"]').forEach(img => {
                    let url = img.src;
                    if (url) {
                        url = url.split('?')[0];
                        imageUrls.add(url);
                    }
                });
            }

            return Array.from(imageUrls);
        }
        else if (site === 'mercari' || site === 'mercari-shops') {
            // メルカリとメルカリショップの画像を取得
            // サムネイル画像コンテナを特定
            const thumbnailContainer = document.querySelector('div[data-testid="vertical-thumbnail-scroll"]');
            if (thumbnailContainer) {
                // メルカリとメルカリショップでは画像URLのドメインが異なる
                const imgSelector = site === 'mercari' 
                    ? 'img[src*="static.mercdn.net"]'
                    : 'img[src*="assets.mercari-shops-static.com"]';
                
                // サムネイル画像を取得
                thumbnailContainer.querySelectorAll(imgSelector).forEach(img => {
                    let url = img.src;
                    // すでにオリジナルサイズの画像URLが取得できている場合はそのまま使用
                    if (url.includes('/orig/') && !url.includes('?')) {
                        imageUrls.add(url);
                    } else {
                        // クエリパラメータを除去
                        url = url.split('?')[0];
                        // 'detail'を'detail/orig'に変更（元サイズの画像に変換）- メルカリの場合のみ
                        if (site === 'mercari' && !url.includes('/orig/')) {
                            url = url.replace('/detail/', '/detail/orig/');
                        }
                        imageUrls.add(url);
                    }
                });
            }

            // 代替方法: ページ上の全ての対象画像を検索
            if (imageUrls.size === 0) {
                // メルカリとメルカリショップでは画像URLのドメインが異なる
                const domainSelector = site === 'mercari' 
                    ? 'img[src*="static.mercdn.net"]'
                    : 'img[src*="assets.mercari-shops-static.com"]';
                
                document.querySelectorAll(domainSelector).forEach(img => {
                    let url = img.src;
                    if (url) {
                        url = url.split('?')[0];
                        if (site === 'mercari' && !url.includes('/orig/')) {
                            url = url.replace('/detail/', '/detail/orig/');
                        }
                        imageUrls.add(url);
                    }
                });

                // picture要素内も検索
                const pictureDomainSelector = site === 'mercari' 
                    ? 'picture img[src*="static.mercdn.net"]'
                    : 'picture img[src*="assets.mercari-shops-static.com"]';
                
                document.querySelectorAll(pictureDomainSelector).forEach(img => {
                    let url = img.src;
                    if (url) {
                        url = url.split('?')[0];
                        if (site === 'mercari' && !url.includes('/orig/')) {
                            url = url.replace('/detail/', '/detail/orig/');
                        }
                        imageUrls.add(url);
                    }
                });
            }

            return Array.from(imageUrls);
        }
        else if (site === 'ebay') {
            // eBayの画像を取得
            // "x-photos-min-view filmstrip filmstrip-x"クラス内の画像カルーセルを探す
            const carouselContainer = document.querySelector('.x-photos-min-view.filmstrip');

            if (carouselContainer) {
                // "ux-image-carousel-item image-treatment"クラスを持つ要素を取得
                const carouselItems = document.querySelectorAll('.ux-image-carousel-item.image-treatment');
                
                if (carouselItems.length > 0) {
                    carouselItems.forEach(item => {
                        const img = item.querySelector('img');
                        if (img && img.src) {
                            let url = img.src;
                            
                            // s-l500.webp形式の小さい画像を高解像度版に変換
                            // 例: s-l500.webp -> s-l1600.jpg
                            url = url.replace(/\/s-l\d+\.(webp|jpg|jpeg|png)/, '/s-l1600.jpg');
                            
                            imageUrls.add(url);
                        }
                    });
                }
            }

            // バックアップ方法: 他のクラスや構造を試す
            if (imageUrls.size === 0) {
                // 画像カルーセル内のすべての画像を探す
                document.querySelectorAll('.ux-image-carousel img[src*="ebayimg.com"]').forEach(img => {
                    if (img.src) {
                        let url = img.src;
                        url = url.replace(/\/s-l\d+\.(webp|jpg|jpeg|png)/, '/s-l1600.jpg');
                        imageUrls.add(url);
                    }
                });
            }

            // さらなるバックアップ：ページ内のすべてのeBay画像を検索
            if (imageUrls.size === 0) {
                document.querySelectorAll('img[src*="ebayimg.com/images/g/"]').forEach(img => {
                    if (img.src) {
                        let url = img.src;
                        url = url.replace(/\/s-l\d+\.(webp|jpg|jpeg|png)/, '/s-l1600.jpg');
                        imageUrls.add(url);
                    }
                });
            }

            return Array.from(imageUrls);
        }
        else if (site === 'netmall') {
            // ネットモールの画像を取得
            // product-gallery-modal__slider クラスのコンテナを探す
            const sliderContainer = document.querySelector('.product-gallery-modal__slider');
            
            if (sliderContainer) {
                // swiper-wrapper クラスを探す
                const swiperWrapper = sliderContainer.querySelector('.swiper-wrapper');
                
                if (swiperWrapper) {
                    // swiper-slide を含むクラスを持つ要素をすべて取得
                    const slides = swiperWrapper.querySelectorAll('[class*="swiper-slide"]');
                    
                    if (slides.length > 0) {
                        slides.forEach(slide => {
                            // 各スライド内の画像を取得
                            const img = slide.querySelector('img');
                            if (img && img.src) {
                                // 高解像度画像の取得を試みる
                                // srcとdata-srcの両方をチェック
                                let url = img.dataset.src || img.src;
                                
                                // クエリパラメータを除去
                                url = url.split('?')[0];
                                
                                imageUrls.add(url);
                            }
                        });
                    }
                }
            }
            
            // バックアップ方法: 商品ギャラリーの画像を探す
            if (imageUrls.size === 0) {
                document.querySelectorAll('.product-gallery img[src*="/uploads/"]').forEach(img => {
                    if (img.src) {
                        let url = img.src.split('?')[0];
                        imageUrls.add(url);
                    }
                });
                
                // data-src属性もチェック
                document.querySelectorAll('.product-gallery img[data-src*="/uploads/"]').forEach(img => {
                    if (img.dataset.src) {
                        let url = img.dataset.src.split('?')[0];
                        imageUrls.add(url);
                    }
                });
            }
            
            // さらなるバックアップ: ページ内の商品画像らしきものをすべて探す
            if (imageUrls.size === 0) {
                document.querySelectorAll('img[src*="/uploads/product/"]').forEach(img => {
                    if (img.src) {
                        let url = img.src.split('?')[0];
                        imageUrls.add(url);
                    }
                });
            }
            
            return Array.from(imageUrls);
        }

        return Array.from(imageUrls);
    }

    // 画像をダウンロードする関数
    function downloadImages(urls) {
        if (urls.length === 0) {
            updateStatus('商品画像が見つかりませんでした');
            return;
        }

        // 商品IDを取得（URLから抽出）
        const pathParts = window.location.pathname.split('/');
        let itemId = '';

        // サイトによって商品IDの取得方法が異なる
        if (currentSite === 'yahooauc') {
            // ヤフオクの場合、オークションIDを取得（最後の部分）
            for (let i = pathParts.length - 1; i >= 0; i--) {
                if (pathParts[i].match(/^[a-z][0-9]+$/)) {
                    itemId = pathParts[i];
                    break;
                }
            }
            // 見つからない場合はURLの最後の部分を使用
            if (!itemId) {
                itemId = pathParts[pathParts.length - 1];
            }
        } else if (currentSite === 'ebay') {
            // eBayの場合、/itm/の後の部分を商品IDとして使用
            for (let i = 0; i < pathParts.length; i++) {
                if (pathParts[i] === 'itm' && i + 1 < pathParts.length) {
                    itemId = pathParts[i + 1];
                    break;
                }
            }
            // 見つからない場合はURLの最後の部分を使用
            if (!itemId) {
                itemId = pathParts[pathParts.length - 1];
            }
        } else {
            // 他のサイトは最後のパスセグメントを商品IDとする
            itemId = pathParts[pathParts.length - 1];
        }

        // プログレスバーを更新する関数
        const updateProgress = (current, total) => {
            const percentage = Math.round((current / total) * 100);
            if (progressBarElement) {
                progressBarElement.style.width = `${percentage}%`;
            }
        };

        // サイト名を取得
        const site = currentSite;
        let siteName;

        switch(site) {
            case 'yahooauc':
                siteName = 'yahooauc';
                break;
            case 'paypay':
                siteName = 'paypay';
                break;
            case 'rakuma':
                siteName = 'rakuma';
                break;
            case 'mercari':
                siteName = 'mercari';
                break;
            case 'mercari-shops':
                siteName = 'mercari-shops';
                break;
            case 'ebay':
                siteName = 'ebay';
                break;
            case 'netmall':
                siteName = 'netmall';
                break;
            default:
                siteName = 'ecommerce';
        }

        // 画像のダウンロードを開始
        let completedCount = 0;
        isDownloading = true;
        updateStatus(`ダウンロード開始 (0/${urls.length})`);

        // 各画像をダウンロード
        urls.forEach((url, index) => {
            // ファイル名を作成
            let filename;

            // URLからファイル名部分を抽出
            const urlParts = url.split('/');
            const lastPart = urlParts[urlParts.length - 1];

            if (site === 'yahooauc') {
                // ヤフオクの場合
                filename = `${siteName}_${itemId}_${index + 1}_${lastPart}`;
            }
            else if (site === 'paypay') {
                // PayPayフリマの場合
                const filenameMatch = lastPart.match(/(.+?\.jpg)/);
                const extractedFilename = filenameMatch ? filenameMatch[1] : `image_${index + 1}.jpg`;
                filename = `${siteName}_${itemId}_${index + 1}_${extractedFilename}`;
            }
            else if (site === 'rakuma') {
                // ラクマの場合
                filename = `${siteName}_${itemId}_${index + 1}_${lastPart}`;
            }
            else if (site === 'mercari' || site === 'mercari-shops') {
                // メルカリとメルカリショップの場合
                const filenameParts = lastPart.split('.');
                let imageIndex;
                try {
                    imageIndex = filenameParts[0].split('_')[1] || (index + 1);
                } catch (e) {
                    imageIndex = index + 1;
                }
                filename = `${siteName}_${itemId}_${imageIndex}.jpg`;
            }
            else if (site === 'ebay') {
                // eBayの場合
                // URLからファイル名を作成
                const urlMatch = url.match(/\/g\/([^\/]+)\//);
                const imageId = urlMatch ? urlMatch[1] : `image_${index + 1}`;
                filename = `${siteName}_${itemId}_${index + 1}_${imageId}.jpg`;
            }
            else if (site === 'netmall') {
                // ネットモールの場合
                // URLからファイル名を抽出、または通し番号を使用
                const fileExt = lastPart.includes('.') ? lastPart.split('.').pop() : 'jpg';
                filename = `${siteName}_${itemId}_${index + 1}.${fileExt}`;
            }

            // ダウンロード処理
            setTimeout(() => {
                try {
                    GM_download({
                        url: url,
                        name: filename,
                        onload: function() {
                            completedCount++;
                            updateStatus(`ダウンロード中 (${completedCount}/${urls.length})`);
                            updateProgress(completedCount, urls.length);

                            if (completedCount === urls.length) {
                                setTimeout(() => {
                                    updateStatus(`完了！全${urls.length}枚のダウンロード完了`);
                                    if (downloadButton) {
                                        downloadButton.disabled = false;
                                        downloadButton.textContent = '再ダウンロード';
                                    }
                                    isDownloading = false;
                                }, 500);
                            }
                        },
                        onerror: function(error) {
                            console.error('ダウンロードエラー:', error);
                            completedCount++;
                            updateStatus(`エラー: ${completedCount}/${urls.length}`);
                            updateProgress(completedCount, urls.length);

                            if (completedCount === urls.length) {
                                isDownloading = false;
                            }
                        }
                    });
                } catch (e) {
                    console.error('ダウンロード例外:', e);
                    completedCount++;
                    updateStatus(`エラーが発生しました: ${e.message}`);
                    updateProgress(completedCount, urls.length);

                    if (completedCount === urls.length) {
                        isDownloading = false;
                    }
                }
            }, index * 300); // 各ダウンロードを300msずつ遅延させる
        });
    }

    // ステータス更新関数
    function updateStatus(message) {
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    // ダウンロードパネルを作成
    function createDownloadPanel() {
        // すでにパネルが存在する場合は削除
        if (downloadPanel) {
            downloadPanel.remove();
        }

        downloadPanel = document.createElement('div');
        downloadPanel.className = `ec-image-downloader ${currentSite}`;
        downloadPanel.id = 'ec-image-downloader-panel';

        const title = document.createElement('div');
        title.className = 'ec-image-downloader-title';

        const siteName = getSiteName(currentSite);
        title.innerHTML = `<span class="ec-image-downloader-icon">📷</span> ${siteName}商品画像`;

        const imgUrls = getImageUrls();
        imageCountElement = document.createElement('span');
        imageCountElement.className = 'ec-image-downloader-count';
        imageCountElement.textContent = imgUrls.length;
        title.appendChild(imageCountElement);

        downloadButton = document.createElement('button');
        downloadButton.id = 'ec-download-btn';
        downloadButton.className = 'ec-image-downloader-btn';
        downloadButton.textContent = '商品画像をダウンロード';
        downloadButton.addEventListener('click', () => {
            downloadButton.disabled = true;
            downloadButton.textContent = 'ダウンロード中...';
            const freshUrls = getImageUrls(); // クリック時に最新のURLを取得
            downloadImages(freshUrls);
        });

        statusElement = document.createElement('div');
        statusElement.className = 'ec-image-downloader-status';
        statusElement.textContent = '準備完了';

        const progressContainer = document.createElement('div');
        progressContainer.className = 'ec-download-progress';

        progressBarElement = document.createElement('div');
        progressBarElement.className = 'ec-download-progress-bar';
        progressContainer.appendChild(progressBarElement);

        // フッター要素を追加
        const footer = document.createElement('div');
        footer.className = 'ec-image-downloader-footer';
        footer.textContent = '© 2025 Junichi Ushiku';

        const minimizeBtn = document.createElement('button');
        minimizeBtn.className = 'ec-minimize-btn';
        minimizeBtn.innerHTML = '−';
        minimizeBtn.title = '最小化/最大化';
        minimizeBtn.addEventListener('click', () => {
            downloadPanel.classList.toggle('ec-minimized');
            minimizeBtn.innerHTML = downloadPanel.classList.contains('ec-minimized') ? '+' : '−';
        });

        downloadPanel.appendChild(title);
        downloadPanel.appendChild(downloadButton);
        downloadPanel.appendChild(statusElement);
        downloadPanel.appendChild(progressContainer);
        downloadPanel.appendChild(footer); // フッターをパネルに追加
        downloadPanel.appendChild(minimizeBtn);

        document.body.appendChild(downloadPanel);
    }

    // ダウンロードパネルを削除
    function removeDownloadPanel() {
        if (downloadPanel) {
            downloadPanel.remove();
            downloadPanel = null;
        } else {
            const existingPanel = document.getElementById('ec-image-downloader-panel');
            if (existingPanel) {
                existingPanel.remove();
            }
        }
    }

    // 現在の商品IDを取得
    function getCurrentItemId() {
        const pathParts = window.location.pathname.split('/');
        // ヤフオクの場合
        if (currentSite === 'yahooauc') {
            for (let i = pathParts.length - 1; i >= 0; i--) {
                if (pathParts[i].match(/^[a-z][0-9]+$/)) {
                    return pathParts[i];
                }
            }
        }
        // eBayの場合
        else if (currentSite === 'ebay') {
            for (let i = 0; i < pathParts.length; i++) {
                if (pathParts[i] === 'itm' && i + 1 < pathParts.length) {
                    return pathParts[i + 1];
                }
            }
        }
        return pathParts[pathParts.length - 1];
    }

    // UI情報を更新
    function updateUIInfo() {
        const isProduct = isProductPage();

        // 商品ページではない場合はパネルを削除
        if (!isProduct) {
            removeDownloadPanel();
            return;
        }

        const newSite = detectSite();
        const newItemId = getCurrentItemId();

        // サイトまたは商品IDが変わった場合（ページ移動があった場合）
        if (newSite !== currentSite || newItemId !== currentItemId) {
            currentSite = newSite;
            currentItemId = newItemId;

            // 少し待ってからUI更新（DOMが読み込まれるのを待つ）
            setTimeout(() => {
                createDownloadPanel(); // パネルを再作成
            }, 1000);
        }
    }

    // URL変更を監視する関数
    function monitorURLChange() {
        let lastUrl = location.href;

        // MutationObserverでDOM変更を監視
        const observer = new MutationObserver(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                updateUIInfo();
            }
        });

        observer.observe(document, { subtree: true, childList: true });

        // バックアップとして定期的にチェック
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                updateUIInfo();
            }
        }, 1000);
    }

    // SPAアプリケーション用のナビゲーション監視
    function monitorSpaNavigation() {
        // pushState と replaceState をオーバーライド
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function() {
            originalPushState.apply(this, arguments);
            setTimeout(updateUIInfo, 500);
        };

        history.replaceState = function() {
            originalReplaceState.apply(this, arguments);
            setTimeout(updateUIInfo, 500);
        };

        // popstate イベントも監視
        window.addEventListener('popstate', () => {
            setTimeout(updateUIInfo, 500);
        });
    }

    // メイン処理
    function init() {
        // 商品ページかどうかをチェック
        if (!isProductPage()) {
            console.log('商品ページではないため、ツールを表示しません');
            removeDownloadPanel();
            return;
        }

        // 現在のサイトとIDを設定
        currentSite = detectSite();
        currentItemId = getCurrentItemId();

        if (currentSite === 'unknown') {
            console.warn('対応していないサイトです');
            return;
        }

        // パネルを作成
        createDownloadPanel();

        // URL変更の監視を開始
        monitorURLChange();

        // SPA用の監視も追加
        monitorSpaNavigation();

        // 定期的に画像数を更新（DOMが動的に変更されることがあるため）
        setInterval(() => {
            // 商品ページでなくなった場合はパネルを削除
            if (!isProductPage()) {
                removeDownloadPanel();
                return;
            }

            // ダウンロード中は更新しない
            if (isDownloading) return;

            const imgUrls = getImageUrls();
            if (imageCountElement && imgUrls.length !== parseInt(imageCountElement.textContent)) {
                imageCountElement.textContent = imgUrls.length;
            }
        }, 2000);
    }

    // ページが完全に読み込まれた後に実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(init, 1000);
        });
    } else {
        setTimeout(init, 1000);
    }

    // ウィンドウ読み込み完了時にも実行（バックアップ）
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (!downloadPanel) {
                init();
            }
        }, 1500);
    });
})(); 