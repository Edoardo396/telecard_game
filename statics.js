function compare(x, y) {
    if (x === y) {
        return 0;
    }
    return x > y ? 1 : -1;
}

function distinct(value, index, self) {
    return self.indexOf(value) === index;
}

module.exports = {
    compare, distinct
};