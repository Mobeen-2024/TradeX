import { ISeriesApi } from 'lightweight-charts';

export class OrderLinesRenderer {
    static render(
        ctx: CanvasRenderingContext2D,
        chart: any,
        candleSeries: ISeriesApi<"Candlestick">,
        positions: any[],
        orders: any[],
        alerts: any[],
        currentPrice: number,
        width: number
    ) {
        // 1. Render Positions
        positions.forEach(pos => {
            const y = candleSeries.priceToCoordinate(pos.entry);
            if (y === null) return;

            const isLong = pos.type === 'LONG';
            const color = isLong ? '#0ecb81' : '#f6465d';
            
            // Draw Line
            ctx.setLineDash([]);
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            // Label
            this.drawLabel(ctx, 10, y, `${pos.type} ${pos.size}`, color, '#ffffff');
            
            // PnL Badge
            const pnl = pos.pnl || 0;
            const pnlText = `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} USDT`;
            this.drawLabel(ctx, width - 80, y, pnlText, pnl >= 0 ? '#0ecb81' : '#f6465d', '#ffffff');
        });

        // 2. Render Open Orders
        orders.forEach(order => {
            const y = candleSeries.priceToCoordinate(order.price);
            if (y === null) return;

            const color = order.side === 'Buy' ? '#0ecb81' : '#f6465d';
            
            // Dotted Line
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            // Label
            this.drawLabel(ctx, 10, y, `LIMIT ${order.side} ${order.amount}`, 'rgba(43, 49, 57, 0.8)', color);
        });

        // 3. Render Price Alerts
        alerts.forEach(alert => {
            const y = candleSeries.priceToCoordinate(alert.price);
            if (y === null) return;

            ctx.setLineDash([2, 2]);
            ctx.strokeStyle = '#F0B90B';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            this.drawLabel(ctx, width / 2 - 30, y, `ALERT ${alert.price}`, '#F0B90B', '#161a1e');
        });
        
        ctx.setLineDash([]);
    }

    private static drawLabel(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, bgColor: string, textColor: string) {
        ctx.font = 'bold 10px Inter';
        const metrics = ctx.measureText(text);
        const padding = 4;
        const rectW = metrics.width + padding * 2;
        const rectH = 16;

        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.rect(x, y - rectH / 2, rectW, rectH);
        ctx.fill();

        ctx.fillStyle = textColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + padding, y);
    }
}
