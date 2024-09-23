import { Token } from "./lexer";
import { MethodDeclaration } from "./Statement";
import { getInput } from "./stdlib/stdin";
import {
  ClassInstanceValue,
  Hashmapish,
  InternalClassValue,
  InternalMethodValue,
  NullValue,
  PackageValue,
  StringValue,
  Value,
} from "./Value";

export class Environment implements Hashmapish {
  parent?: Environment;
  underlying: Map<string, Value>;

  constructor(parent?: Environment) {
    this.parent = parent;
    this.underlying = new Map();
  }

  getValue(name: string): Value {
    return this.get(name);
  }

  get(name: string): Value {
    if (this.underlying.has(name)) return this.underlying.get(name)!;
    else if (this.parent) return this.parent.get(name);
    else throw new Error(`Undefined variable: ${name}`);
  }

  getAllKeys(): string[] {
    return [...this.underlying.keys(), ...(this.parent ? this.parent.getAllKeys() : [])] as string[];
  }

  setValue(name: string, value: Value) {
    this.underlying.set(name, value);
  }

  getKeys(): string[] {
    return [...this.underlying.keys(), ...(this.parent ? this.parent.getKeys() : [])] as string[];
  }
}

export function createStandardLibrary() {
  const environment = new Environment();

  const println = new InternalMethodValue<[StringValue]>(
    environment,
    [{ name: "value", type: { base: new Token(), dim: 0 } }],
    (value) => {
      console.log(value.value);
      return new NullValue();
    }
  );

  const System = new ClassInstanceValue(
    new Map([
      ["out", new ClassInstanceValue(new Map([["println", println]]))],
      ["in", new ClassInstanceValue(new Map())],
    ])
  );

  environment.setValue("System", System);

  const Scanner = new InternalClassValue(
    new Map(),
    new Map([
      [
        "nextLine",
        new InternalMethodValue(environment, [], () => {
          const input = getInput();
          return new StringValue(input);
        }),
      ],
    ])
  );

  const java = new PackageValue(new Map([["util", new PackageValue(new Map([["Scanner", Scanner]]))]]));
  environment.setValue("java", java);

  return environment;
}

export class Interpreter {
  public environment: Environment;
  constructor(environment: Environment) {
    this.environment = environment;
  }
}
