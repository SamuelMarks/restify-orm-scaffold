import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

interface IDocEntry {
    name?: string;
    fileName?: string;
    documentation?: string;
    type?: string;
    constructors?: IDocEntry[];
    parameters?: IDocEntry[];
    decorators?: IDocEntry[];
    returnType?: string;
}

/** Generate documention for all classes in a set of .ts files */
function generateDocumentation(fileNames: string[], options: ts.CompilerOptions): void {
    // Build a program using the set of root file names in fileNames
    const program = ts.createProgram(fileNames, options);

    // Get the checker, we will use it to find more about classes
    const checker = program.getTypeChecker();

    const output: IDocEntry[] = [];

    // Visit every sourceFile in the program
    for (const sourceFile of program.getSourceFiles()) {
        // Walk the tree to search for classes
        ts.forEachChild(sourceFile, visit);
    }

    // print out the doc
    fs.writeFileSync('classes.json', JSON.stringify(output, undefined, 4));

    return;

    /** visit nodes finding exported classes */
    function visit(node: ts.Node) {
        // Only consider exported nodes
        if (!isNodeExported(node)) {
            return;
        }

        if (node.kind === ts.SyntaxKind.ClassDeclaration) {
            // This is a top level class, get its symbol

            output.push(serializeClass(node as ts.ClassDeclaration));
            // No need to walk any further, class expressions/inner declarations
            // cannot be exported
        } else if (node.kind === ts.SyntaxKind.ModuleDeclaration) {
            // This is a namespace, visit its children
            ts.forEachChild(node, visit);
        }
    }

    /** Serialize a symbol into a json object */
    function serializeSymbol(symbol: ts.Symbol): IDocEntry {
        return {
            name: symbol.getName(),
            documentation: ts.displayPartsToString(symbol.getDocumentationComment(void 0)),
            type: checker.typeToString(checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration))
        };
    }

    /** Serialize a class symbol infomration */
    function serializeClass(node: ts.ClassDeclaration) {
        const symbol = checker.getSymbolAtLocation(node.name);

        const details = serializeSymbol(symbol);
        if (!details.decorators) return details;
        // Get the construct signatures
        details.decorators = node.decorators.map(serializeDecorator);
        const constructorType = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);
        details.constructors = constructorType.getConstructSignatures().map(serializeSignature);

        return details;
    }

    function serializeDecorator(decorator: ts.Decorator) {
        const symbol = checker.getSymbolAtLocation(decorator.expression.getFirstToken());
        const decoratorType = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);
        const details = serializeSymbol(symbol);
        details.constructors = decoratorType.getCallSignatures().map(serializeSignature);
        return details;
    }

    /** Serialize a signature (call or construct) */
    function serializeSignature(signature: ts.Signature) {
        return {
            parameters: signature.parameters.map(serializeSymbol),
            returnType: checker.typeToString(signature.getReturnType()),
            documentation: ts.displayPartsToString(signature.getDocumentationComment(void 0))
        };
    }

    /** True if this is visible outside this file, false otherwise */
    function isNodeExported(node: ts.Node): boolean {
        /* tslint:disable:no-bitwise */
        return (node.flags & ts.NodeFlags.ExportContext) !== 0
            || (node.parent && node.parent.kind === ts.SyntaxKind.SourceFile);
    }
}

if (require.main === module) {
    generateDocumentation([path.join(__dirname, 'api', 'user', 'models.ts')], {
        target: ts.ScriptTarget.Latest, module: ts.ModuleKind.CommonJS
    });
    /* tslint:disable:no-console */
    // console.info(result);
}
