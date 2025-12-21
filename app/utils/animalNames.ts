// Animal names with emojis for generating unique client identifiers
export const animals = [
    { name: 'panda', emoji: '🐼' },
    { name: 'koala', emoji: '🐨' },
    { name: 'penguin', emoji: '🐧' },
    { name: 'flamingo', emoji: '🦩' },
    { name: 'dolphin', emoji: '🐬' },
    { name: 'owl', emoji: '🦉' },
    { name: 'fox', emoji: '🦊' },
    { name: 'rabbit', emoji: '🐰' },
    { name: 'hedgehog', emoji: '🦔' },
    { name: 'otter', emoji: '🦦' },
    { name: 'cat', emoji: '🐱' },
    { name: 'swan', emoji: '🦢' },
    { name: 'falcon', emoji: '🦅' },
    { name: 'wolf', emoji: '🐺' },
    { name: 'bear', emoji: '🐻' },
    { name: 'tiger', emoji: '🐯' },
    { name: 'lion', emoji: '🦁' },
    { name: 'eagle', emoji: '🦅' },
    { name: 'dog', emoji: '🐶' },
    { name: 'unicorn', emoji: '🦄' },
    { name: 'butterfly', emoji: '🦋' },
    { name: 'bee', emoji: '🐝' },
    { name: 'turtle', emoji: '🐢' },
    { name: 'octopus', emoji: '🐙' },
    { name: 'parrot', emoji: '🦜' },
]

export function getRandomAnimal() {
    return animals[Math.floor(Math.random() * animals.length)]
}

export function generateClientName(firstName: string): string {
    const animal = getRandomAnimal()
    if (!animal) return firstName.toLowerCase()
    const cleanName = firstName.toLowerCase().trim().replace(/\s+/g, '')
    return `${animal.emoji} ${cleanName}-${animal.name}`
}
