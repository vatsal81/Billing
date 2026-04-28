const mongoose = require('mongoose');

const settingsSchema = mongoose.Schema({
    shopName: { type: String, default: 'શ્રી હરિ ડ્રેસીસ & કટપીસ' },
    shopSubTitle: { type: String, default: 'Wholesale & Retail' },
    shopAddress: { type: String, default: 'માધવ પાર્ક ૧, શ્રી હરિ કોમ્પલેક્ષની બાજુમાં, આલાપ રોયલ પામની પાછળ, બાપાસીતારામ ચોક, મવડી, રાજકોટ - ૩૬૦ ૦૦૪.' },
    gstin: { type: String, default: '24BRNPM8073Q1ZU' },
    stateInfo: { type: String, default: 'State : Gujarat    Code : 24' },
    terms1: { type: String, default: '૧. ન્યાયક્ષેત્ર રાજકોટ રહેશે.' },
    terms2: { type: String, default: '૨. ભુલચૂક લેવી દેવી.' },
    stampName: { type: String, default: 'શ્રી હરિ ડ્રેસીસ & કટપીસ' }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
