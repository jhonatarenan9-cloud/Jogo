import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { PREFIXO_NUVEM, urlDaFoto } from '@/lib/fotos-nuvem';

const NA_WEB = Platform.OS === 'web';
/** Fotos ficam com no máximo esta largura: boas para contrato e vistoria, leves para guardar. */
const LARGURA_MAX = NA_WEB ? 640 : 1000;
const QUALIDADE = NA_WEB ? 0.5 : 0.6;

export type OrigemFoto = 'camera' | 'galeria';

export class SemPermissao extends Error {}

/**
 * Abre a câmera ou a galeria e devolve as fotos já reduzidas e guardadas.
 * No celular, cada foto vira um arquivo do app; na web, um data URI.
 */
export async function escolherFotos(origem: OrigemFoto, varias = false): Promise<string[]> {
  if (!NA_WEB) {
    const permissao =
      origem === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      throw new SemPermissao(
        origem === 'camera'
          ? 'Permita o uso da câmera nas configurações do celular para tirar fotos.'
          : 'Permita o acesso às fotos nas configurações do celular para escolher imagens.',
      );
    }
  }
  const opcoes: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.9,
    allowsMultipleSelection: varias && origem === 'galeria',
    selectionLimit: varias ? 10 : 1,
  };
  const resultado =
    origem === 'camera' ? await ImagePicker.launchCameraAsync(opcoes) : await ImagePicker.launchImageLibraryAsync(opcoes);
  if (resultado.canceled) return [];
  const fotos: string[] = [];
  for (const a of resultado.assets) fotos.push(await guardar(a.uri, a.width));
  return fotos;
}

async function guardar(uri: string, largura: number) {
  const contexto = ImageManipulator.manipulate(uri);
  if (largura > LARGURA_MAX) contexto.resize({ width: LARGURA_MAX });
  const imagem = await contexto.renderAsync();
  const salvo = await imagem.saveAsync({ compress: QUALIDADE, format: SaveFormat.JPEG, base64: NA_WEB });
  if (NA_WEB) return `data:image/jpeg;base64,${salvo.base64}`;

  const pasta = new Directory(Paths.document, 'fotos');
  if (!pasta.exists) pasta.create({ intermediates: true, idempotent: true });
  const destino = new File(pasta, `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.jpg`);
  await new File(salvo.uri).copy(destino);
  return destino.uri;
}

/**
 * Converte a foto para data URI, o único formato que o gerador de PDF
 * aceita em todos os celulares. Fotos da internet seguem como estão.
 */
export async function fotoParaPdf(foto?: string): Promise<string> {
  if (!foto) return '';
  if (foto.startsWith(PREFIXO_NUVEM)) foto = await urlDaFoto(foto);
  if (foto.startsWith('data:')) return foto;
  if (foto.startsWith('http')) {
    try {
      const blob = await (await fetch(foto)).blob();
      return await new Promise<string>((ok, falha) => {
        const leitor = new FileReader();
        leitor.onload = () => ok(String(leitor.result));
        leitor.onerror = falha;
        leitor.readAsDataURL(blob);
      });
    } catch {
      return foto;
    }
  }
  try {
    const base64 = await new File(foto).base64();
    return `data:image/jpeg;base64,${base64}`;
  } catch {
    return '';
  }
}
