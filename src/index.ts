import * as p from '@clack/prompts';
import pc from 'picocolors';
import { GenerateScript, GenerateSubject } from './engine';


async function main() {
    p.intro(pc.bgCyan(pc.black(' ORION HOSTING - GÉNÉRATEUR VIDÉO ')));

    const action = await p.select({
        message: 'Que voulez-vous faire ?',
        options: [
            { value: 'generate', label: 'Start generating' },
            { value: 'cancel', label: 'Cancel' },
        ],
    });

    if (p.isCancel(action)) {
        process.exit(0);
    }

    const subject = await GenerateSubject(p);

    const script = await GenerateScript(p, subject);

    console.log(pc.green('\nSujet généré :'));
    console.log(pc.cyan(subject));

    console.log(pc.green('\nScript généré :'));
    console.log(pc.cyan(script));
}

main()