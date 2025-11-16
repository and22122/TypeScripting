class shape {
    private points: [number, number][]
    
    public constructor(pointList: [number, number][]) {
        this.points = pointList
    }

    public rotate(angle: number) {
        for (let i = 0; i < this.points.length; i ++) {

        }
    }
}

enum modes {
    DEG,
    RAD
}

class Vector {
    public x: number;
    public y: number;

    public constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    public add(v2: Vector): Vector {
        return new Vector(this.x + v2.x, this.y + v2.y);
    }

    public sub(v2: Vector): Vector {
        return new Vector(this.x - v2.x, this.y - v2.y);
    }

    public mag(): number {
        return (this.x ** 2 + this.y ** 2) ** 0.5;
    }

    public normalized(): Vector {
        if (!this.mag()) {
            return new Vector(this.x, this.y)
        }
        else {
            return new Vector(this.x / this.mag(), this.y / this.mag())
        }
    }

    public dotProd(v2: Vector): Vector {
        return new Vector(this.x * v2.x, this.y * v2.y)
    }
}