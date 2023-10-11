import { ExtensionSettings, ItemStyle } from '../@typings/FloatTypes';
import { Skinbid } from '../@typings/SkinbidTypes';
import { activateHandler } from '../eventhandler';
import { getBuffMapping, getPriceMapping, loadMapping } from '../mappinghandler';
import { initSettings } from '../util/extensionsettings';
import { handleSpecialStickerNames } from '../util/helperfunctions';

async function init() {
    if (!location.hostname.includes('skinbid.com')) {
        return;
    }

    console.log('[BetterFloat] Starting BetterFloat');
    console.time('[BetterFloat] Skinbid init timer');
    // catch the events thrown by the script
    // this has to be done as first thing to not miss timed events
    activateHandler();

    extensionSettings = await initSettings();

    // if (!extensionSettings.enableSkinbid) {
    //     console.log('[BetterFloat] Skinbid disabled');
    //     return;
    // }

    console.group('[BetterFloat] Loading mappings...');
    // await loadMapping();
    // await loadBuffMapping();
    console.groupEnd();

    console.timeEnd('[BetterFloat] Skinbid init timer');

    // createLiveLink();

    await firstLaunch();

    // mutation observer is only needed once
    if (!isObserverActive) {
        isObserverActive = true;
        await applyMutation();
        console.log('[BetterFloat] Observer started');
    }
}

async function firstLaunch() {
    console.log('[BetterFloat] First launch, url: ', location.pathname, location.search);
    if (location.pathname == '/') {
        let items = document.getElementsByTagName('NGU-TILE');
        for (let i = 0; i < items.length; i++) {
            await adjustItem(items[i]);
        }
    } else if (location.pathname == '/listings') {
        let items = document.getElementsByClassName('item');
        for (let i = 0; i < items.length; i++) {
            await adjustListItem(items[i]);
        }
    } else if (location.pathname.includes('/market/')) {
        let items = document.querySelectorAll('.item');
        // first one is big item
        await adjustBigItem(items[0]);
        for (let i = 1; i < items.length; i++) {
            await adjustItem(items[i]);
        }
    }
}

async function applyMutation() {
    let observer = new MutationObserver(async (mutations) => {
        if (extensionSettings.enableSkinport) {
            for (let mutation of mutations) {
                for (let i = 0; i < mutation.addedNodes.length; i++) {
                    let addedNode = mutation.addedNodes[i];
                    // some nodes are not elements, so we need to check
                    if (!(addedNode instanceof HTMLElement)) continue;
                    // console.log("Added node: ", addedNode);

                    if (addedNode.children.length == 1) {
                        let firstChild = addedNode.children[0];
                        if (firstChild.tagName.includes('AUCTION-LIST-ITEM')) {
                            await adjustListItem(firstChild);
                        }
                    }

                    if (addedNode.className) {
                        let className = addedNode.className.toString();
                        if (className.includes('item') && addedNode.tagName == 'NGU-TILE') {
                            console.log('Found item: ', addedNode);
                            await adjustItem(addedNode);
                        } else if (className.includes('item-category')) {
                            // big item page
                            console.log('Found big item: ', document.querySelector('.item'));
                            await adjustBigItem(document.querySelector('.item')!);
                        } else if (addedNode.tagName == 'APP-PRICE-CHART') {
                            console.log('Found price chart: ', addedNode);
                        }
                    }
                }
            }
        }
    });
    observer.observe(document, { childList: true, subtree: true });
}

async function adjustBigItem(container: Element) {
    const item = getSkinbidFullItem(container);
    console.log('item: ', item);
    if (!item) return;
    const priceResult = await addBuffPrice(item, container, itemSelectors.page);
}

async function adjustListItem(container: Element) {
    const item = getSkinbidItem(container, itemSelectors.list);
    if (!item) return;
    const priceResult = await addBuffPrice(item, container, itemSelectors.list);
}

async function adjustItem(container: Element) {
    const item = getSkinbidItem(container, itemSelectors.card);
    if (!item) return;
    const priceResult = await addBuffPrice(item, container, itemSelectors.card);
    // if (extensionSettings.spStickerPrices) {
    //     await addStickerInfo(container, item, itemSelectors.preview, priceResult.price_difference);
    // }
    // if (extensionSettings.spFloatColoring) {
    //     await addFloatColoring(container, item);
    // }
}

async function addBuffPrice(item: Skinbid.HTMLItem, container: Element, selector: ItemSelectors) {
    await loadMapping();
    let { buff_name, priceListing, priceOrder } = await getBuffPrice(item);
    let buff_id = await getBuffMapping(buff_name);

    let priceDiv = container.querySelector(selector.priceDiv);
    const currencySymbol = (<HTMLElement>priceDiv?.firstChild).textContent?.trim().charAt(0);
    if (priceDiv && !container.querySelector('.betterfloat-buffprice')) {
        generateBuffContainer(priceDiv as HTMLElement, priceListing, priceOrder, currencySymbol ?? '$');
    }

    const buffHref = buff_id > 0 ? `https://buff.163.com/goods/${buff_id}` : `https://buff.163.com/market/csgo#tab=selling&page_num=1&search=${encodeURIComponent(buff_name)}`;
    const buffContainer = container.querySelector('.betterfloat-buff-container');
    if (buffContainer) {
        (<HTMLElement>buffContainer).onclick = (e: Event) => {
            e.stopPropagation();
            e.preventDefault();
            window.open(buffHref, '_blank');
        };
        if (selector == itemSelectors.list) {
            (<HTMLElement>buffContainer).style.alignItems = 'center';
            let suggestContainer = <HTMLElement>buffContainer.querySelector('.suggested-price');
            suggestContainer.style.display = 'flex';
            suggestContainer.style.flexDirection = 'column';
            suggestContainer.children[2].remove();
            let buffIcon = <HTMLElement>buffContainer.children[0];
            buffIcon.style.height = '30px';
        } else if (selector == itemSelectors.page) {
            let parentDiv = container.querySelector('.item-bids-time-info');
            if (parentDiv) {
                // buffContainer.parentElement?.removeChild(buffContainer);
                (<HTMLElement>parentDiv).style.marginTop = '0';
                parentDiv.before(buffContainer);
            }
            (<HTMLElement>buffContainer).style.margin = '20px 0 0 0';

        }
    }

    const difference = item.price - (extensionSettings.spPriceReference == 1 ? priceListing : priceOrder);
    if (extensionSettings.spBuffDifference) {
        let discountContainer = <HTMLElement>container.querySelector('.discount');
        if (!discountContainer) {
            discountContainer = document.createElement('div');
            discountContainer.className = 'discount';
            container.querySelector('.item-price-wrapper')?.appendChild(discountContainer);
        }
        if (item.price !== 0 && !discountContainer.querySelector('.betterfloat-sale-tag')) {
            discountContainer.className += ' betterfloat-sale-tag';
            discountContainer.style.color = difference == 0 ? 'black' : difference < 0 ? '#0cb083' : '#ce0000';
            discountContainer.style.fontWeight = '400';
            discountContainer.style.fontSize = '14px';
            discountContainer.textContent = difference == 0 ? `-${currencySymbol}0` : (difference > 0 ? '+' : '-') + currencySymbol + Math.abs(difference).toFixed(1);
        }
    } else {
        if (container.querySelector('.discount')) {
            (<HTMLElement>container.querySelector('.discount')).className += 'betterfloat-sale-tag';
        }
    }

    return {
        price_difference: difference,
    };
}

async function generateBuffContainer(container: HTMLElement, priceListing: number, priceOrder: number, currencySymbol: string, isItemPage = false) {
    let buffContainer = document.createElement('div');
    buffContainer.className = 'betterfloat-buff-container';
    buffContainer.style.display = 'flex';
    buffContainer.style.margin = '5px 0';
    buffContainer.style.cursor = 'pointer';
    buffContainer.style.alignItems = 'center';
    let buffImage = document.createElement('img');
    buffImage.setAttribute('src', runtimePublicURL + '/buff_favicon.png');
    buffImage.setAttribute('style', `height: 20px; margin-right: 5px; border: 1px solid #323c47; ${isItemPage ? 'margin-bottom: 1px;' : ''}`);
    buffContainer.appendChild(buffImage);
    let buffPrice = document.createElement('div');
    buffPrice.setAttribute('class', 'suggested-price betterfloat-buffprice');
    buffPrice.setAttribute('style', 'margin: 2px 0 0 0');
    if (isItemPage) {
        buffPrice.style.fontSize = '18px';
    }
    let tooltipSpan = document.createElement('span');
    tooltipSpan.setAttribute('class', 'betterfloat-buff-tooltip');
    tooltipSpan.textContent = 'Bid: Highest buy order price; Ask: Lowest listing price';
    buffPrice.appendChild(tooltipSpan);
    let buffPriceBid = document.createElement('span');
    buffPriceBid.setAttribute('style', 'color: orange;');
    buffPriceBid.textContent = `Bid ${currencySymbol}${priceOrder.toFixed(2)}`;
    buffPrice.appendChild(buffPriceBid);
    let buffPriceDivider;
    buffPriceDivider = document.createElement('span');
    buffPriceDivider.setAttribute('style', 'color: #323c47;margin: 0 3px 0 3px;');
    buffPriceDivider.textContent = '|';
    buffPrice.appendChild(buffPriceDivider);
    let buffPriceAsk = document.createElement('span');
    buffPriceAsk.setAttribute('style', 'color: greenyellow;');
    buffPriceAsk.textContent = `Ask ${currencySymbol}${priceListing.toFixed(2)}`;
    buffPrice.appendChild(buffPriceAsk);
    buffContainer.appendChild(buffPrice);
    let parentDiv = container.parentElement;
    if (parentDiv) {
        parentDiv.after(buffContainer);
        let divider = document.createElement('div');
        parentDiv.after(divider);
    }
}

async function getBuffPrice(item: Skinbid.HTMLItem): Promise<{ buff_name: string; priceListing: number; priceOrder: number }> {
    let priceMapping = await getPriceMapping();
    let buff_name = handleSpecialStickerNames(createBuffName(item));
    let helperPrice: number | null = null;

    if (!priceMapping[buff_name] || !priceMapping[buff_name]['buff163'] || !priceMapping[buff_name]['buff163']['starting_at'] || !priceMapping[buff_name]['buff163']['highest_order']) {
        console.debug(`[BetterFloat] No price mapping found for ${buff_name}`);
        helperPrice = 0;
    }

    // we cannot use the getItemPrice function here as it does not return the correct price for doppler skins
    let priceListing = 0;
    let priceOrder = 0;
    if (typeof helperPrice == 'number') {
        priceListing = helperPrice;
        priceOrder = helperPrice;
    } else if (priceMapping[buff_name]) {
        if (item.style != '' && item.style != 'Vanilla') {
            priceListing = priceMapping[buff_name]['buff163']['starting_at']['doppler'][item.style];
            priceOrder = priceMapping[buff_name]['buff163']['highest_order']['doppler'][item.style];
        } else {
            priceListing = priceMapping[buff_name]['buff163']['starting_at']['price'];
            priceOrder = priceMapping[buff_name]['buff163']['highest_order']['price'];
        }
    }
    if (priceListing == undefined) {
        priceListing = 0;
    }
    if (priceOrder == undefined) {
        priceOrder = 0;
    }

    //convert prices to user's currency
    // let currencyRate = await getUserCurrencyRate(extensionSettings.skinportRates);
    // if (extensionSettings.skinportRates == 'skinport') {
    //     // origin price of rate is non-USD, so we need to divide
    //     priceListing = priceListing / currencyRate;
    //     priceOrder = priceOrder / currencyRate;
    // } else {
    //     // origin price of rate is USD, so we need to multiply
    //     priceListing = priceListing * currencyRate;
    //     priceOrder = priceOrder * currencyRate;
    // }

    return { buff_name, priceListing, priceOrder };
}
function createBuffName(item: Skinbid.HTMLItem): string {
    let full_name = `${item.name}`;
    if (item.type.includes('Sticker') || item.type.includes('Patch') || item.type.includes('Music Kit')) {
        full_name = item.type + ' | ' + full_name;
    } else if (
        item.type.includes('Case') ||
        item.type.includes('Collectible') ||
        item.type.includes('Gift') ||
        item.type.includes('Key') ||
        item.type.includes('Pass') ||
        item.type.includes('Pin') ||
        item.type.includes('Tool') ||
        item.style == 'Vanilla'
    ) {
        full_name = item.name;
    } else if (item.type.includes('Agent')) {
        full_name = `${item.name} | ${item.type}`;
    } else if (item.name.includes('Dragon King')) {
        full_name = `M4A4 | 龍王 (Dragon King)${' (' + item.wear_name + ')'}`;
    } else {
        full_name = `${item.type.includes('Knife') || item.type.includes('Gloves') ? '★ ' : ''}${item.name.includes('StatTrak') ? 'StatTrak™ ' : ''}${item.type.split(' • ')[1]} | ${item.name.replace(
            'StatTrak™ ',
            ''
        )} (${item.wear_name})`;
    }
    return full_name.replace(/ +(?= )/g, '').replace(/\//g, '-');
}

const itemSelectors = {
    card: {
        name: '.item-name',
        type: '.item-type',
        price: '.item-price-wrapper > div',
        priceDiv: '.item-price-wrapper',
        wear: '.quality-float-row'
    },
    list: {
        name: '.item-category-and-stickers .first-row',
        type: '.item-category-and-stickers .second-row',
        price: '.section-price .price',
        priceDiv: '.section-price-first-row',
        wear: '.quality-float-row'
    },
    page: {
        name: '.item-title',
        type: '.item-category',
        price: '.item-bids-time-info > div',
        priceDiv: '.item-bids-time-info .value',
        wear: '.item-detail:nth-child(2)'
    },
} as const;

type ItemSelectors = typeof itemSelectors[keyof typeof itemSelectors];

function getSkinbidFullItem(container: Element) {
    let name = container.querySelector('.item-title')?.textContent ?? '';
    if (name == '') {
        return null;
    }
    let priceText = container.querySelector('.item-bids-time-info')?.children[0].children[1]?.textContent?.trim() ?? '';
    let price = Number(priceText.replace(/[^0-9.-]+/g, ''));
    let type = container.querySelector('.item-category')?.textContent?.trim() ?? '';
    
    let style: ItemStyle = '';
    if (name.includes('Doppler')) {
        style = name.split(' ')[1] as ItemStyle;
    } else if (name.includes('★')) {
        style = 'Vanilla';
    }
    let itemDetails = container.querySelectorAll('.details-actions-section .item-detail');
    let wearText = itemDetails[0]?.children[1]?.textContent ?? '';
    let wear = Number(itemDetails[1]?.children[1]?.textContent ?? 0) ;
    return {
        name: name.trim(),
        price: price,
        type: type,
        style: style,
        wear: wear,
        wear_name: wearText,
    };
}

function getSkinbidItem(container: Element, selector: ItemSelectors): Skinbid.HTMLItem | null {
    let name = container.querySelector(selector.name)?.textContent ?? '';
    if (name == '') {
        return null;
    }
    let price = Number(container.querySelector(selector.price)?.textContent?.replace(/[^0-9.-]+/g, ''));
    let type = container.querySelector(selector.type)?.textContent?.trim() ?? '';

    let style: ItemStyle = '';
    if (name.includes('Doppler')) {
        style = name.split(' ')[1] as ItemStyle;
    } else if (name.includes('★')) {
        style = 'Vanilla';
    }
    const getWear = (wearDiv: HTMLElement) => {
        let wear = '';

        if (wearDiv) {
            let w = wearDiv.textContent?.trim().split(' ')[0];
            switch (w) {
                case 'FN':
                    wear = 'Factory New';
                    break;
                case 'MW':
                    wear = 'Minimal Wear';
                    break;
                case 'FT':
                    wear = 'Field-Tested';
                    break;
                case 'WW':
                    wear = 'Well-Worn';
                    break;
                case 'BS':
                    wear = 'Battle-Scarred';
                    break;
                default:
                    wear = '';
                    break;
            }
        }
        return wear;
    };
    let wearDiv = container.querySelector(selector.wear);
    let wear = wearDiv ? getWear(wearDiv as HTMLElement) : '';
    return {
        name: name.trim(),
        price: price,
        type: type,
        style: style,
        wear: Number(wearDiv?.textContent?.split('/')[1]),
        wear_name: wear,
    };
}

let extensionSettings: ExtensionSettings;
let runtimePublicURL = chrome.runtime.getURL('../public');
// mutation observer active?
let isObserverActive = false;
console.log('[BetterFloat] Skinbid content script loaded');
init();
