// Write a code to attack some simple substitution cipher. To reduce the complexity of this one we will use
// only uppercase letters, so the keyspace is only 26! To get this one right automatically you will probably need
// to use some sort of genetic algorithm (which worked the best last year), simulated annealing or gradient descent.
// Seriously, write it right now, you will need it to decipher the next one as well. Bear in mind, thereâ  s no spaces.
const fs = require('fs')

const { ALPHABET } = require('./constants')

const text = 'EFFPQLEKVTVPCPYFLMVHQLUEWCNVWFYGHYTCETHQEKLPVMSAKSPVPAPVYWMVHQLUSPQLYWLASLFVWPQLMVHQLUPLRPSQLULQESPBLWPCSVRVWFLHLWFLWPUEWFYOTCMQYSLWOYWYETHQEKLPVMSAKSPVPAPVYWHEPPLUWSGYULEMQTLPPLUGUYOLWDTVSQETHQEKLPVPVSMTLEUPQEPCYAMEWWYTYWDLUULTCYWPQLSEOLSVOHTLUYAPVWLYGDALSSVWDPQLNLCKCLRQEASPVILSLEUMQBQVMQCYAHUYKEKTCASLFPYFLMVHQLUPQLHULIVYASHEUEDUEHQBVTTPQLVWFLRYGMYVWMVFLWMLSPVTTBYUNESESADDLSPVYWCYAMEWPUCPYFVIVFLPQLOLSSEDLVWHEUPSKCPQLWAOKLUYGMQEUEMPLUSVWENLCEWFEHHTCGULXALWMCEWETCSVSPYLEMQYGPQLOMEWCYAGVWFEBECPYASLQVDQLUYUFLUGULXALWMCSPEPVSPVMSBVPQPQVSPCHLYGMVHQLUPQLWLRPOEDVMETBYUFBVTTPENLPYPQLWLRPTEKLWZYCKVPTCSTESQPQULLGYAUMEHVPETFWMEHVPETBZMEHVPETB';
const UPPER_CASE_ALPHABET = ALPHABET.map(char => char.toUpperCase()).join('');
const ALPHABET_SIZE = UPPER_CASE_ALPHABET.length;
const GENERATIONS_COUNT = 500;
const POPULATION_SIZE = 100;
const PROBABILITY_OF_MUTATION = 0.2;
const PROBABILITY_OF_CROSSOVER = 0.65;
const CROSSOVER_POINTS = 5;

const BIGRAMS = JSON.parse(fs.readFileSync('./lab1/bigrams.json', 'utf8'))
const TRIGRAMS = JSON.parse(fs.readFileSync('./lab1/trigrams.json', 'utf8'))

const decode = (text, key) => text.split('').map((letter) => UPPER_CASE_ALPHABET[key.indexOf(letter)]).join('');

const getRandIntInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const getNRandIntsInRange = (n, min, max) => {
    const result = [];
    while (result.length < n) {
        const value = getRandIntInRange(min, max);
        if(!result.includes(value)) {
            result.push(value);
        }
    }
    return result;
};

const generateInitialPopulation = (size) => {
    return [...new Array(size)].map(() => {
        const variants = UPPER_CASE_ALPHABET.split('');
        const result = [];
        while (variants.length) {
            result.push(variants.splice(getRandIntInRange(0, variants.length - 1), 1))
        }
        return { key: result.join(''), score: 0 };
    })
}

const performCrossover = (variantA, variantB) => {
    const crossoverPoints = getNRandIntsInRange(CROSSOVER_POINTS, 0, variantA.length - 1);
    let variantBArrayCopy = variantB.split('');
    const result = new Array(variantA.length).fill(null);
    crossoverPoints.forEach((index) => {
        const letter = variantA[index]
        result[index] = letter;

        variantBArrayCopy = variantBArrayCopy.filter(char => char !== letter);
    })
    return result.map((char, index) => char || variantBArrayCopy.shift()).join('')
}

const getIndexesForMutation = (variant) => {
    const indexes = [];
    while (indexes.length < 4) {

        const randomIndex = getRandIntInRange(0, variant.length - 1);
        if (!indexes.includes(randomIndex)) {
            indexes.push(randomIndex);
        }
    }
    return indexes;
}
const swapTwoLetters = (text, firstIndex, lastIndex) => {
    const textArray = text.split('');
    const firstLetter = textArray[firstIndex];
    const secondLetter = textArray.splice(lastIndex, 1, firstLetter);
    textArray.splice(firstIndex, 1, secondLetter);
    return textArray.join('');
}

const performMutation = (variant) => {
    const indexes = getIndexesForMutation(variant);
    return swapTwoLetters(variant, indexes[0], indexes[1])
}

const extractBigrams = (text) => {
    return text.split('').reduce((bigrams, char, index) => {
        if (index === text.length - 1) { return bigrams }
        return [...bigrams, char + text[index + 1]]
    }, [])
}

const extractTrigrams = (text) => {
    return text.split('').reduce((trigrams, char, index) => {
        if (index >= text.length - 2) { return trigrams }
        return [...trigrams, char + text[index + 1] + text[index + 2]]
    }, [])
}

const calculateNGramsCount = (nGrams) => {
    return nGrams.reduce((acc, nGram) => {
        return { ...acc, [nGram]: acc[nGram] ? acc[nGram] + 1 : 1 }
    }, {})
}

const calculateNGramsFrequencies = (nGrams, textLength) => {
    return Object.keys(nGrams).map(nGram => ({ key: nGram, frequency: nGrams[nGram] / textLength }))
}

const calculateScore = (decodedText) => {
    const birams = extractBigrams(decodedText);
    const trigrams = extractTrigrams(decodedText);
    const bigramsCount = calculateNGramsCount(birams);
    const trigramsCount = calculateNGramsCount(trigrams);
    const bigramsFrequencies = calculateNGramsFrequencies(bigramsCount, birams.length)
    const trigramsFrequencies = calculateNGramsFrequencies(trigramsCount, trigrams.length)
    const bigramsScore = bigramsFrequencies.reduce((sum, bigram) => {
        return sum + Math.abs(bigram.frequency - BIGRAMS[bigram.key])
    }, 0)
    const trigramsScore = trigramsFrequencies.reduce((sum, trigram) => {
        if (!TRIGRAMS[trigram.key]) return sum;
        return sum + Math.abs(trigram.frequency - TRIGRAMS[trigram.key])
    }, 0)
    return 0.2 * bigramsScore + 0.8 * trigramsScore;
}

const fitness = (population, text) => {
    population.forEach((variant) => {
        if (!variant.score) {
            const decodedText = decode(text, variant.key)

            variant.score = calculateScore(decodedText);
        }
    })
}

const selection = (population) => population.sort((a, b) => a.score - b.score).slice(0, population.length / 2);

const crossover = (population) => {
    if (Math.random() > 1 - PROBABILITY_OF_CROSSOVER) {
        const firstParentIndex = getRandIntInRange(0, population.length - 1)
        const secondParentIndex = getRandIntInRange(0, population.length - 1)
        let child = performCrossover(population[firstParentIndex].key, population[secondParentIndex].key);
        if (Math.random() > 1 - PROBABILITY_OF_MUTATION) {
            child = performMutation(child);
        }
        population.push({ key: child, score: 0 });
    }
};

const getKey = (text) => {
    let currentPopulation = generateInitialPopulation(POPULATION_SIZE);
    for (let i = 0; i < GENERATIONS_COUNT; i++) {
        console.log(i)
        fitness(currentPopulation, text);
        currentPopulation = selection(currentPopulation);
        while (currentPopulation.length < POPULATION_SIZE) {
            crossover(currentPopulation);
        }
    }

    return currentPopulation.sort((a, b) => a.score - b.score)[0].key;
}


// const key = getKey(text);
// console.log('KEY: ', key);
// decode(text, key);

module.exports = {
    generateInitialPopulation,
    selection,
    crossover,
    calculateScore,
    UPPER_CASE_ALPHABET
}
