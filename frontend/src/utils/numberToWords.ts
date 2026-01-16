export function numberToWords(num: number): string {
    const a = [
        '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
        'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const n = ('000000000' + num.toFixed(2)).slice(-12).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})(\d{2})\.(\d{2})$/);

    if (!n) return '';

    let str = '';

    // Crores
    str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0] as any] + ' ' + a[n[2][1] as any]) + 'Crore ' : '';
    // Lakhs
    str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0] as any] + ' ' + a[n[3][1] as any]) + 'Lakh ' : '';
    // Thousands
    str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0] as any] + ' ' + a[n[4][1] as any]) + 'Thousand ' : '';
    // Hundreds
    str += (Number(n[5]) !== 0) ? (a[Number(n[5])] || b[n[5][0] as any] + ' ' + a[n[5][1] as any]) + 'Hundred ' : '';

    // Units
    if (Number(n[6]) !== 0) {
        str += ((str !== '') ? 'and ' : '') + (a[Number(n[6])] || b[n[6][0] as any] + ' ' + a[n[6][1] as any]);
    }

    str += 'Rupees ';

    // Paise
    if (Number(n[7]) !== 0) {
        str += 'and ' + (a[Number(n[7])] || b[n[7][0] as any] + ' ' + a[n[7][1] as any]) + 'Paise ';
    }

    return str + 'Only';
}
