const mongoose = require('mongoose');
const Settings = require('./models/Settings');

const updateSettings = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/smart-billing');
        console.log('Connected to DB');
        
        const updates = {
            shopName: 'શ્રી હરિ ડ્રેસીસ & કટપીસ',
            shopAddress: 'માધવ પાર્ક ૧, શ્રી હરિ કોમ્પલેક્ષની બાજુમાં, આલાપ રોયલ પામની પાછળ, બાપાસીતારામ ચોક, મવડી, રાજકોટ - ૩૬૦ ૦૦૪.',
            terms1: '૧. ન્યાયક્ષેત્ર રાજકોટ રહેશે.',
            terms2: '૨. ભુલચૂક લેવી દેવી.'
        };
        
        await Settings.findOneAndUpdate(
            {}, 
            updates, 
            { upsert: true, returnDocument: 'after' }
        );
        
        console.log('All settings updated successfully!');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

updateSettings();
