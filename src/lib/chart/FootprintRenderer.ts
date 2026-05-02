import { IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts';

export interface FootprintCell {
    price: number;
    bidVolume: number;
    askVolume: number;
    totalVolume: number;
    isBuyImbalance: boolean;
    isSellImbalance: boolean;
    isPartOfStackedBuy: boolean;
    isPartOfStackedSell: boolean;
    isUnfinishedBusiness: boolean;
}

export interface FootprintData {
    time: number;
    isUp: boolean;
    cells: FootprintCell[];
    delta: number;
    maxVolume: number;
    hvnPrice: number;
    isMultipleHVN: boolean;
}

export class FootprintRenderer {
    static generateMock(candle: CandlestickData, volume: number, settings: any, prevFp?: FootprintData): FootprintData {
        const tickSize = settings.tickSize || 10;
        const minPrice = Math.floor(candle.low / tickSize) * tickSize;
        const maxPrice = Math.ceil(candle.high / tickSize) * tickSize;
        
        const cells: FootprintCell[] = [];
        let delta = 0;
        let maxVol = 0;
        let hvnPrice = minPrice;
        
        const levelsCount = Math.max(1, (maxPrice - minPrice) / tickSize + 1);
        let remainingVol = volume;
        
        for (let p = maxPrice; p >= minPrice; p -= tickSize) {
            let cellVol = (Math.random() * (remainingVol / (levelsCount / 2)));
            if (p < minPrice + tickSize) cellVol = remainingVol;
            
            // Trades Filter Logic
            if (settings.minTradeFilter && cellVol < settings.minTradeFilter) {
                cellVol = 0;
            }
            
            remainingVol -= cellVol;
            if(cellVol < 0) cellVol = 0;
            
            let bidVol = cellVol * (Math.random() * 0.6 + 0.2);
            let askVol = cellVol - bidVol;
            
            if (candle.close > candle.open) {
                askVol = cellVol * (Math.random() * 0.4 + 0.6);
                bidVol = cellVol - askVol;
            } else {
                bidVol = cellVol * (Math.random() * 0.4 + 0.6);
                askVol = cellVol - bidVol;
            }
            
            const bidV = Math.round(bidVol);
            const askV = Math.round(askVol);
            
            cells.push({
                price: p,
                bidVolume: bidV,
                askVolume: askV,
                totalVolume: Math.round(cellVol),
                isBuyImbalance: false,
                isSellImbalance: false,
                isPartOfStackedBuy: false,
                isPartOfStackedSell: false,
                isUnfinishedBusiness: false
            });
            
            delta += (askV - bidV);
            if (cellVol > maxVol) {
                maxVol = cellVol;
                hvnPrice = p;
            }
        }
        
        const fp: FootprintData = {
            time: candle.time as number,
            isUp: candle.close >= candle.open,
            cells,
            delta,
            maxVolume: maxVol,
            hvnPrice,
            isMultipleHVN: prevFp ? prevFp.hvnPrice === hvnPrice : false
        };

        this.recalculateAnalytics(fp, settings);
        return fp;
    }

    static updateLiveFootprint(fp: FootprintData, trade: any, settings: any, prevFp?: FootprintData) {
        const tickSize = settings.tickSize || 10;
        const targetPrice = Math.round(trade.p / tickSize) * tickSize;
        
        let cell = fp.cells.find(c => c.price === targetPrice);
        if (!cell) {
            cell = {
                price: targetPrice,
                bidVolume: 0,
                askVolume: 0,
                totalVolume: 0,
                isBuyImbalance: false,
                isSellImbalance: false,
                isPartOfStackedBuy: false,
                isPartOfStackedSell: false,
                isUnfinishedBusiness: false
            };
            fp.cells.push(cell);
            fp.cells.sort((a, b) => b.price - a.price);
        }
        
        if (trade.m) cell.bidVolume += trade.q;
        else cell.askVolume += trade.q;
        cell.totalVolume += trade.q;
        
        if (cell.totalVolume > fp.maxVolume) {
            fp.maxVolume = cell.totalVolume;
            fp.hvnPrice = cell.price;
        }
        
        fp.delta = fp.cells.reduce((acc, c) => acc + (c.askVolume - c.bidVolume), 0);
        fp.isMultipleHVN = prevFp ? prevFp.hvnPrice === fp.hvnPrice : false;

        this.recalculateAnalytics(fp, settings);
    }

    private static recalculateAnalytics(fp: FootprintData, settings: any) {
        const cells = fp.cells;
        // Reset flags
        cells.forEach(c => {
            c.isBuyImbalance = false;
            c.isSellImbalance = false;
            c.isPartOfStackedBuy = false;
            c.isPartOfStackedSell = false;
            c.isUnfinishedBusiness = false;
        });

        // Imbalances Logic
        const ratio = settings.imbalanceRatio || 3;
        for (let i = 0; i < cells.length - 1; i++) {
            const askP = cells[i].askVolume;
            const bidPminus1 = cells[i+1].bidVolume;
            if (askP >= ratio * bidPminus1 && askP > 0) cells[i].isBuyImbalance = true;
            
            const bidP = cells[i+1].bidVolume;
            const askPplus1 = cells[i].askVolume;
            if (bidP >= ratio * askPplus1 && bidP > 0) cells[i+1].isSellImbalance = true;
        }

        // Stacked Imbalances Logic
        const stackCount = settings.stackedImbalanceCount || 3;
        let buyStack = 0, sellStack = 0;
        for (let i = 0; i < cells.length; i++) {
            if (cells[i].isBuyImbalance) buyStack++;
            else {
                if (buyStack >= stackCount) for (let j = i - buyStack; j < i; j++) cells[j].isPartOfStackedBuy = true;
                buyStack = 0;
            }
            if (cells[i].isSellImbalance) sellStack++;
            else {
                if (sellStack >= stackCount) for (let j = i - sellStack; j < i; j++) cells[j].isPartOfStackedSell = true;
                sellStack = 0;
            }
        }
        if (buyStack >= stackCount) for (let j = cells.length - buyStack; j < cells.length; j++) cells[j].isPartOfStackedBuy = true;
        if (sellStack >= stackCount) for (let j = cells.length - sellStack; j < cells.length; j++) cells[j].isPartOfStackedSell = true;

        // Unfinished Business Logic
        if (cells.length > 0) {
            const top = cells[0];
            const bottom = cells[cells.length - 1];
            if (top.bidVolume > 0) top.isUnfinishedBusiness = true;
            if (bottom.askVolume > 0) bottom.isUnfinishedBusiness = true;
        }
    }

    static render(
        ctx: CanvasRenderingContext2D, 
        fp: FootprintData, 
        x: number, 
        candleWidth: number, 
        candleSeries: any, 
        settings: any
    ) {
        const c1 = candleSeries.priceToCoordinate(fp.cells[0].price);
        const c2 = candleSeries.priceToCoordinate(fp.cells[0].price + settings.tickSize);
        const cellHeight = (c1 !== null && c2 !== null) ? Math.abs(c1 - c2) : 16;
        const halfWidth = candleWidth / 2;

        // Draw Candle Outline
        if (fp.cells.length > 0) {
            let topY = candleSeries.priceToCoordinate(fp.cells[0].price);
            let bottomY = candleSeries.priceToCoordinate(fp.cells[fp.cells.length - 1].price);
            if (topY !== null && bottomY !== null) {
                if (topY > bottomY) {
                    const temp = topY;
                    topY = bottomY;
                    bottomY = temp;
                }
                const height = (bottomY - topY) + cellHeight;
                const startY = topY - cellHeight / 2;
                
                ctx.strokeStyle = fp.isUp ? 'rgba(14, 203, 129, 0.8)' : 'rgba(246, 70, 93, 0.8)';
                ctx.lineWidth = 1;
                ctx.strokeRect(x - halfWidth, startY, candleWidth, height);
            }
        }

        const formatVolume = (v: number) => {
            if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
            if (v >= 1000) return (v / 1000).toFixed(1).replace('.0', '') + 'K';
            return v.toString();
        };

        fp.cells.forEach((cell, idx) => {
            const y = candleSeries.priceToCoordinate(cell.price);
            if (y === null) return;
            
            let intensity = cell.totalVolume / fp.maxVolume;
            if (intensity < 0.15) intensity = 0.15; 
            
            if (settings.showShading) {
                if (cell.askVolume > cell.bidVolume) {
                    ctx.fillStyle = `rgba(14, 203, 129, ${intensity * 0.6})`;
                } else if (cell.bidVolume > cell.askVolume) {
                    ctx.fillStyle = `rgba(246, 70, 93, ${intensity * 0.6})`;
                } else {
                    ctx.fillStyle = `rgba(132, 142, 156, ${intensity * 0.4})`;
                }
                ctx.fillRect(x - halfWidth, y - cellHeight/2, candleWidth, cellHeight);
            }

            // Stacked Imbalance Highlight
            if (cell.isPartOfStackedBuy || cell.isPartOfStackedSell) {
                ctx.strokeStyle = cell.isPartOfStackedBuy ? '#0ecb81' : '#f6465d';
                ctx.lineWidth = 2;
                ctx.strokeRect(x - halfWidth + 1, y - cellHeight/2 + 1, candleWidth - 2, cellHeight - 2);
            }
            
            // Multiple HVN Highlight
            if (fp.isMultipleHVN && cell.price === fp.hvnPrice) {
                ctx.strokeStyle = '#F0B90B';
                ctx.lineWidth = 3;
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#F0B90B';
                ctx.strokeRect(x - halfWidth - 2, y - cellHeight/2 - 2, candleWidth + 4, cellHeight + 4);
                ctx.shadowBlur = 0;
            } else if (cell.price === fp.hvnPrice) {
                // Normal HVN
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.strokeRect(x - halfWidth + 1, y - cellHeight/2 + 1, candleWidth - 2, cellHeight - 2);
            }

            // Unfinished Business Dotted Line
            if (settings.showUnfinishedBusiness && cell.isUnfinishedBusiness) {
                ctx.setLineDash([4, 4]);
                ctx.strokeStyle = cell.price === fp.cells[0].price ? '#f6465d' : '#0ecb81';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x + halfWidth, y);
                ctx.lineTo(x + candleWidth * 5, y); // Extend into the future
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Text
            if (candleWidth > 45) {
                ctx.font = `500 ${Math.min(11, cellHeight * 0.85)}px "JetBrains Mono"`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Bid Text
                ctx.fillStyle = cell.isSellImbalance ? '#3b82f6' : 'rgba(255,255,255,0.9)';
                ctx.fillText(formatVolume(cell.bidVolume), x - halfWidth/2, y);
                
                // Ask Text
                ctx.fillStyle = cell.isBuyImbalance ? '#3b82f6' : 'rgba(255,255,255,0.9)';
                ctx.fillText(formatVolume(cell.askVolume), x + halfWidth/2, y);
            }
        });

        // Delta Block at the bottom
        const bottomPrice = Math.min(...fp.cells.map(c => c.price));
        const bottomY = candleSeries.priceToCoordinate(bottomPrice);
        if (bottomY && candleWidth > 30) {
            ctx.fillStyle = fp.delta >= 0 ? 'rgba(14, 203, 129, 0.2)' : 'rgba(246, 70, 93, 0.2)';
            ctx.fillRect(x - halfWidth, bottomY + cellHeight / 2 + 2, candleWidth, 14);
            ctx.font = 'bold 9px "JetBrains Mono"';
            ctx.textAlign = 'center';
            ctx.fillStyle = fp.delta >= 0 ? '#0ecb81' : '#f6465d';
            ctx.fillText(formatVolume(Math.abs(fp.delta)), x, bottomY + cellHeight / 2 + 9);
        }
    }
}
